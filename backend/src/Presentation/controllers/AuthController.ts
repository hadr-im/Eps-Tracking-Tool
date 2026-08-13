import { Request, Response } from 'express';
import passport from 'passport';
import { authUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { validateDto } from '../middlewares/validate';
import { SignupDto } from '../../Application/dtos/auth/SignupDto';
import { LoginDto } from '../../Application/dtos/auth/LoginDto';
import { ForgotPasswordDto } from '../../Application/dtos/auth/ForgotPasswordDto';
import { ResetPasswordDto } from '../../Application/dtos/auth/ResetPasswordDto';
import type { GoogleProfileDto } from '../../Application/dtos/auth/GoogleProfileDto';

// Cookie configuration 

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
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
      const user = await authUseCase.signup(req.body as SignupDto);
      res.status(201).json({ user });
    } catch (err) {
      handleError(res, err);
    }
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

      res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
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
    try {
      // req.user is the GoogleProfile set by the Passport strategy
      const profile = req.user as unknown as GoogleProfileDto;
      const { accessToken, refreshToken, user } = await authUseCase.googleAuth(profile);

      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);

      // Redirect to frontend with access token as a query param
      // (frontend reads it once, stores in memory, then discards from URL)
      const redirectUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/oauth/callback?accessToken=${accessToken}`;
      res.redirect(redirectUrl);
    } catch (err) {
      handleError(res, err);
    }
  }
}
