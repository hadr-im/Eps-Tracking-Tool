import { Request, Response } from 'express';
import passport from 'passport';
import { authUseCase, signupOptionsUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { validateDto } from '../middlewares/validate';
import { SignupDto } from '../../Application/dtos/auth/SignupDto';
import { CompleteGoogleSignupDto } from '../../Application/dtos/auth/CompleteGoogleSignupDto';
import { LoginDto } from '../../Application/dtos/auth/LoginDto';
import { ForgotPasswordDto } from '../../Application/dtos/auth/ForgotPasswordDto';
import { ResetPasswordDto } from '../../Application/dtos/auth/ResetPasswordDto';
import type { GoogleProfileDto } from '../../Application/dtos/auth/GoogleProfileDto';

// Cookie configuration 

const REFRESH_COOKIE = 'refreshToken';

const isProduction = process.env['NODE_ENV'] === 'production';

// Frontend and backend are deployed as separate origins, so the refresh cookie
// is cross-site and needs SameSite=None, which browsers only honour on Secure
// cookies. Locally both are http://localhost (different ports = same site for
// cookie purposes), where 'lax' works and 'none' would be dropped for not
// being Secure.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// Error handler 

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Controller 

export class AuthController {
  // POST /auth/signup
  static signupValidation = validateDto(SignupDto);
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { user, tokens } = await authUseCase.signup(req.body as SignupDto);
      AuthController.sendSignupResult(res, user, tokens);
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    Signup response. When the account came back already active (a VP with a
    valid setup code) it also carries a live session, so the client goes
    straight into the app instead of bouncing through the login page.
  */
  private static sendSignupResult(
    res: Response,
    user: unknown,
    tokens: { accessToken: string; refreshToken: string } | null,
  ): void {
    if (!tokens) {
      res.status(201).json({ user });
      return;
    }

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
    res.status(201).json({ user, accessToken: tokens.accessToken });
  }

  // POST /auth/login 
  static loginValidation = validateDto(LoginDto);
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken, refreshToken, user } = await authUseCase.login(req.body as LoginDto);
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
      res.status(200).json({ accessToken, user });
    } catch (err) {
      handleError(res, err);
    }
  }

  // POST /auth/refresh — reads refreshToken from httpOnly cookie 
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
      if (!rawToken) {
        res.status(401).json({ message: 'No refresh token' });
        return;
      }

      const { accessToken, refreshToken } = await authUseCase.refresh(rawToken);
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
      res.status(200).json({ accessToken });
    } catch (err) {
      handleError(res, err);
    }
  }

  // POST /auth/logout — protected route 
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
      if (rawToken) await authUseCase.logout(rawToken);

      // Attributes must match the ones the cookie was set with or the browser
      // keeps it — hence reusing cookieOptions rather than a bespoke object.
      const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
      res.clearCookie(REFRESH_COOKIE, clearOptions);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      handleError(res, err);
    }
  }

  // GET /auth/me protected route 
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const user = await authUseCase.getMe(req.user!.id);
      res.status(200).json(user);
    } catch (err) {
      handleError(res, err);
    }
  }

  // POST /auth/forgot-password 
  static forgotPasswordValidation = validateDto(ForgotPasswordDto);
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      await authUseCase.forgotPassword(req.body as ForgotPasswordDto);
      // Always return 200 — never leak whether the email exists
      res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
    } catch (err) {
      handleError(res, err);
    }
  }

  // POST /auth/reset-password 
  static resetPasswordValidation = validateDto(ResetPasswordDto);
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      await authUseCase.resetPassword(req.body as ResetPasswordDto);
      res.status(200).json({ message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      handleError(res, err);
    }
  }

  // GET /auth/google : redirect to Google consent screen 
  static googleRedirect = passport.authenticate('google', { scope: ['profile', 'email'] });

  // GET /auth/google/callback : Passport callback handler 
  static googleCallbackMiddleware = passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/login?error=oauth_failed`,
  });

  static async googleCallback(req: Request, res: Response): Promise<void> {
    const frontend = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';

    try {
      // req.user is the GoogleProfile set by the Passport strategy
      const profile = req.user as unknown as GoogleProfileDto;
      const result = await authUseCase.googleAuth(profile);

      // First time here: no account exists yet. Send them to step 2 of signup
      // carrying a setup token instead of signing them in.
      if (result.kind === 'setup') {
        res.redirect(
          `${frontend}/signup/complete?token=${encodeURIComponent(result.setupToken)}`,
        );
        return;
      }

      res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);

      // Redirect to frontend with access token as a query param
      // (frontend reads it once, stores in memory, then discards from URL)
      res.redirect(`${frontend}/oauth/callback?accessToken=${result.accessToken}`);
    } catch (err) {
      // This is a browser redirect, not an API call, so surface the reason on
      // the login page rather than rendering raw JSON at the callback URL.
      if (err instanceof AppError) {
        res.redirect(`${frontend}/login?error=${encodeURIComponent(err.message)}`);
        return;
      }
      handleError(res, err);
    }
  }

  // POST /auth/complete-signup — step 2 of the Google signup flow
  static completeGoogleSignupValidation = validateDto(CompleteGoogleSignupDto);
  static async completeGoogleSignup(req: Request, res: Response): Promise<void> {
    try {
      const { user, tokens } = await authUseCase.completeGoogleSignup(
        req.body as CompleteGoogleSignupDto,
      );
      AuthController.sendSignupResult(res, user, tokens);
    } catch (err) {
      handleError(res, err);
    }
  }

  // Signup form lookups (public — the caller has no account yet)

  // GET /auth/signup-options/departments
  static async getDepartments(_req: Request, res: Response): Promise<void> {
    try {
      const departments = await signupOptionsUseCase.getDepartments();
      res.status(200).json({ data: departments });
    } catch (err) {
      handleError(res, err);
    }
  }

  // GET /auth/signup-options/departments/:id/team-leaders
  static async getTeamLeaders(req: Request, res: Response): Promise<void> {
    try {
      const departmentId = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const leaders = await signupOptionsUseCase.getTeamLeaders(departmentId);
      res.status(200).json({ data: leaders });
    } catch (err) {
      handleError(res, err);
    }
  }
}
