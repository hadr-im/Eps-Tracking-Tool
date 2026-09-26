import crypto from 'crypto';
import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { IMailService } from '../../abstracts/IMailService';
import { RefreshToken } from '../../../Domain/entities/RefreshToken';
import { OtpToken } from '../../../Domain/entities/OtpToken';
import { User } from '../../../Domain/entities/User';
import { AuthProvider } from '../../../Domain/enums/AuthProvider';
import { AccountStatus } from '../../../Domain/enums/AccountStatus';
import { UserRole } from '../../../Domain/enums/UserRole';
import { BcryptService } from '../../../Infrastructure/services/BcryptService';
import { JwtService, SetupTokenPayload } from '../../../Infrastructure/jwt/JwtService';
import { UserMapper, UserResponse } from '../../mappers/UserMapper';
import { AppError } from '../../errors/AppError';
import { AccessRequestValidator } from '../user/AccessRequestValidator';
import type { SignupDto } from '../../dtos/auth/SignupDto';
import type { LoginDto } from '../../dtos/auth/LoginDto';
import type { GoogleProfileDto } from '../../dtos/auth/GoogleProfileDto';
import type { CompleteGoogleSignupDto } from '../../dtos/auth/CompleteGoogleSignupDto';
import type { ForgotPasswordDto } from '../../dtos/auth/ForgotPasswordDto';
import type { ResetPasswordDto } from '../../dtos/auth/ResetPasswordDto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: UserResponse;
}

/*
  Signup either queues for approval or goes live immediately (a VP with a
  valid setup code). `tokens` is non-null only in the second case, so an
  account that is already active never has to go back and sign in.
*/
export interface SignupResult {
  user: UserResponse;
  tokens: AuthTokens | null;
}

/*
  Google sign-in has two possible outcomes:
    'login' - the account exists, proceed as a normal sign-in
    'setup' - first time here. No account is created yet; the caller is sent
              to step 2 of signup carrying a short-lived setup token.
*/
export type GoogleAuthResult =
  | ({ kind: 'login' } & LoginResult)
  | { kind: 'setup'; setupToken: string; email: string; fullName: string };

const OTP_EXPIRY_MINUTES = 10;

export class AuthUseCase {
  private readonly accessValidator: AccessRequestValidator;

  constructor(
    private readonly repo: IAuthRepository,
    private readonly bcrypt: BcryptService,
    private readonly jwt: JwtService,
    private readonly mail: IMailService,
  ) {
    this.accessValidator = new AccessRequestValidator(repo);
  }

  // Helpers

  private async issueTokenPair(
    userId: string,
    role: import('../../../Domain/enums/UserRole').UserRole,
    departmentId: string | null,
    isDispatcher: boolean,
  ): Promise<AuthTokens> {
    const payload = { userId, role, departmentId, isDispatcher };
    const accessToken = this.jwt.generateAccessToken(payload);
    const rawRefreshToken = this.jwt.generateRefreshToken(payload);

    const tokenHash = await this.bcrypt.hash(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshTokenEntity = new RefreshToken(
      crypto.randomUUID(),
      userId,
      tokenHash,
      false,
      expiresAt,
      new Date(),
    );
    await this.repo.saveRefreshToken(refreshTokenEntity);

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async findMatchingToken(userId: string, rawToken: string): Promise<RefreshToken | null> {
    const active = await this.repo.findActiveTokensByUser(userId);
    for (const token of active) {
      const matches = await this.bcrypt.compare(rawToken, token.tokenHash);
      if (matches) return token;
    }
    return null;
  }

  /*
    Single gate every session has to pass: at sign-in, on every refresh, and on
    every /me. Checking it in all three places means approval can be revoked
    mid-session — the next refresh (15 minutes at most) ends it.

    Call only AFTER credentials are verified, so the distinct messages below
    cannot be used to probe which email addresses exist.
  */
  /*
    Gate for VP signups.

    Only a VP can approve an account, so a VP request has nobody to approve it
    when the department has none — the first VP would wait on themselves
    forever. This shared secret stands in for that approval: whoever holds it
    is authorised to create a VP. It is the ONLY way a signup grants access
    directly, so it is compared in constant time and never falls back to a
    default when unset.
  */
  private assertValidVpSetupCode(provided: string | undefined): void {
    const expected = process.env['VP_SIGNUP_CODE'];
    if (!expected) {
      throw new AppError(
        'VP signup is not configured on this server. Contact your administrator.',
        503,
      );
    }
    if (!provided) {
      throw new AppError('A VP setup code is required to sign up as a VP.', 400);
    }

    const given = Buffer.from(provided);
    const actual = Buffer.from(expected);
    // Length is compared first because timingSafeEqual throws on a mismatch.
    if (given.length !== actual.length || !crypto.timingSafeEqual(given, actual)) {
      throw new AppError('That VP setup code is not correct.', 403);
    }
  }

  /*
    Turns a lost race on one_vp_per_department into a readable message. Two
    people holding the setup code can submit for the same department at the
    same instant; the database decides, and the loser is told why.
  */
  private translateVpUniqueViolation(err: unknown): unknown {
    const code = (err as { code?: string })?.code;
    const target = String((err as { meta?: { target?: unknown } })?.meta?.target ?? '');
    if (code === 'P2002' && target.includes('vp')) {
      return new AppError('This department already has a VP.', 409);
    }
    return err;
  }

  private assertCanSignIn(user: User): void {
    if (user.status === AccountStatus.PENDING) {
      throw new AppError(
        'Your account is waiting to be approved by your VP. You will be able to sign in once it is.',
        403,
      );
    }
    if (user.status === AccountStatus.REJECTED) {
      throw new AppError(
        user.rejectionReason
          ? `Your signup request was declined: ${user.rejectionReason}`
          : 'Your signup request was declined. Contact your VP for details.',
        403,
      );
    }
    if (user.isDisabled) {
      throw new AppError('Account is disabled', 403);
    }
  }

  // Signup 

  /*
    Creates a PENDING account. Grants nothing.

    The requested placement is validated here purely so the applicant gets an
    immediate, useful error ("Ahmed is already the dispatcher") instead of
    waiting in the queue only to be rejected. The authoritative check runs
    again at approval time.
  */
  async signup(dto: SignupDto): Promise<SignupResult> {
    const existing = await this.repo.findByEmail(dto.email.toLowerCase());
    if (existing) throw new AppError('Email already in use', 409);

    const requested = UserMapper.toRequestedAccess(dto);
    await this.accessValidator.validate({
      role: dto.requestedRole,
      departmentId: dto.requestedDepartmentId,
      teamLeaderId: requested.teamLeaderId,
      isDispatcher: requested.isDispatcher,
    });

    const passwordHash = await this.bcrypt.hash(dto.password);
    const user = UserMapper.fromSignupDto(dto, passwordHash);

    // A correct setup code IS the approval, so the account goes live straight
    // away rather than queuing for a VP who does not exist yet.
    if (dto.requestedRole === UserRole.VP) {
      this.assertValidVpSetupCode(dto.vpSetupCode);
      user.role = UserRole.VP;
      user.departmentId = dto.requestedDepartmentId;
      user.status = AccountStatus.ACTIVE;
    }

    try {
      const saved = await this.repo.save(user);
      return { user: UserMapper.toResponse(saved), tokens: await this.sessionIfActive(saved) };
    } catch (err) {
      throw this.translateVpUniqueViolation(err);
    }
  }

  /*
    Issues a session when the freshly created account is already usable, so
    signup can drop the user straight into the app. Pending accounts get null
    — there is nothing for them to enter yet.
  */
  private async sessionIfActive(user: User): Promise<AuthTokens | null> {
    if (user.status !== AccountStatus.ACTIVE || user.isDisabled) return null;
    return this.issueTokenPair(user.id, user.role, user.departmentId, user.isDispatcher);
  }

  // Login

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.repo.findByEmail(dto.email.toLowerCase());
    if (!user) throw new AppError('Invalid credentials', 401);

    if (user.provider === AuthProvider.GOOGLE && !user.passwordHash) {
      throw new AppError(
        'This account uses Google Sign-In. Use "Forgot password" to set a password.',
        401,
      );
    }

    const valid = await this.bcrypt.compare(dto.password, user.passwordHash!);
    if (!valid) throw new AppError('Invalid credentials', 401);

    // After the password check, so the specific messages cannot be used to
    // enumerate which addresses have accounts.
    this.assertCanSignIn(user);

    const tokens = await this.issueTokenPair(user.id, user.role, user.departmentId, user.isDispatcher);
    return { ...tokens, user: UserMapper.toResponse(user) };
  }

  // Refresh token rotation 

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    let payload: ReturnType<JwtService['verifyRefreshToken']>;
    try {
      payload = this.jwt.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const match = await this.findMatchingToken(payload.userId, rawRefreshToken);
    if (!match) throw new AppError('Refresh token revoked or not found', 401);
    if (match.expiresAt < new Date()) throw new AppError('Refresh token expired', 401);

    // Revoke old token before issuing new pair (rotation)
    await this.repo.revokeRefreshToken(match.id);

    // Reload user to pick up any role/department/approval changes since last login
    const user = await this.repo.findById(payload.userId);
    if (!user) throw new AppError('User not found', 401);
    this.assertCanSignIn(user);

    return this.issueTokenPair(user.id, user.role, user.departmentId, user.isDispatcher);
  }

  // Logout 

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const payload = this.jwt.verifyRefreshToken(rawRefreshToken);
      const match = await this.findMatchingToken(payload.userId, rawRefreshToken);
      if (match) await this.repo.revokeRefreshToken(match.id);
    } catch {
      // Silently succeed token may already be expired/revoked
    }
  }

  // Get current user from access token payload 

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    this.assertCanSignIn(user);
    return UserMapper.toResponse(user);
  }

  // Google OAuth 

  /*
    Handles the OAuth callback. Either signs an existing account in, or — for a
    Google profile with no account yet — returns a setup token and creates
    NOTHING. The user row is written only once step 2 is submitted, so
    abandoning the form leaves no half-configured account behind.
  */
  async googleAuth(profile: GoogleProfileDto): Promise<GoogleAuthResult> {
    let user = await this.repo.findByGoogleId(profile.googleId);

    if (!user) {
      // Email already registered locally? Link the Google account to it ONLY IF email is verified.
      const existingUser = await this.repo.findByEmail(profile.email.toLowerCase()) ?? null;

      if (existingUser) {
        if (!profile.emailVerified) {
          throw new AppError('Google email is unverified. Cannot link to existing account.', 403);
        }

        existingUser.googleId = profile.googleId;
        existingUser.provider = AuthProvider.GOOGLE;
        existingUser.updatedAt = new Date();
        user = await this.repo.save(existingUser);
      } else {
        // Brand new — send them to step 2 rather than creating an account.
        if (!profile.emailVerified) {
          throw new AppError('Your Google email address is not verified.', 403);
        }

        const setupToken = this.jwt.generateSetupToken({
          googleId: profile.googleId,
          email: profile.email.toLowerCase().trim(),
          fullName: profile.fullName,
          avatarUrl: profile.avatar ?? null,
        });

        return {
          kind: 'setup',
          setupToken,
          email: profile.email.toLowerCase().trim(),
          fullName: profile.fullName,
        };
      }
    }

    this.assertCanSignIn(user);

    const tokens = await this.issueTokenPair(user.id, user.role, user.departmentId, user.isDispatcher);
    return { kind: 'login', ...tokens, user: UserMapper.toResponse(user) };
  }

  /*
    Step 2 of Google signup. Creates the PENDING account from the identity
    carried in the setup token plus the placement the user selected.
  */
  async completeGoogleSignup(dto: CompleteGoogleSignupDto): Promise<SignupResult> {
    let setup: SetupTokenPayload;
    try {
      setup = this.jwt.verifySetupToken(dto.setupToken);
    } catch {
      throw new AppError(
        'Your signup session has expired. Please sign in with Google again.',
        401,
      );
    }

    // The token stays valid for its full lifetime, so re-submitting it must not
    // create a second account.
    if (await this.repo.findByGoogleId(setup.googleId)) {
      throw new AppError('An account already exists for this Google profile', 409);
    }
    if (await this.repo.findByEmail(setup.email)) {
      throw new AppError('Email already in use', 409);
    }

    const requested = UserMapper.toRequestedAccess(dto);
    await this.accessValidator.validate({
      role: dto.requestedRole,
      departmentId: dto.requestedDepartmentId,
      teamLeaderId: requested.teamLeaderId,
      isDispatcher: requested.isDispatcher,
    });

    const user = UserMapper.fromGoogleSignup(setup, requested);

    if (dto.requestedRole === UserRole.VP) {
      this.assertValidVpSetupCode(dto.vpSetupCode);
      user.role = UserRole.VP;
      user.departmentId = dto.requestedDepartmentId;
      user.status = AccountStatus.ACTIVE;
    }

    try {
      const saved = await this.repo.save(user);
      return { user: UserMapper.toResponse(saved), tokens: await this.sessionIfActive(saved) };
    } catch (err) {
      throw this.translateVpUniqueViolation(err);
    }
  }

  // Forgot password 

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.repo.findByEmail(dto.email.toLowerCase());

    // Silent success — never reveal whether an email exists
    if (!user) return;

    const rawOtp = Math.floor(100_000 + Math.random() * 900_000).toString();
    const otpHash = await this.bcrypt.hash(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const otpEntity = new OtpToken(
      crypto.randomUUID(),
      user.id,
      otpHash,
      false,
      expiresAt,
      new Date(),
    );
    await this.repo.saveOtp(otpEntity);
    await this.mail.sendOtp(user.email, rawOtp);
  }

  // Reset password 

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.repo.findByEmail(dto.email.toLowerCase());
    if (!user) throw new AppError('Invalid request', 400);

    const otpToken = await this.repo.findValidOtpByUserId(user.id);
    if (!otpToken) throw new AppError('OTP not found or expired', 400);

    const otpValid = await this.bcrypt.compare(dto.otp, otpToken.otpHash);
    if (!otpValid) throw new AppError('Invalid OTP', 400);

    // Update password — also enables email login for Google-only accounts
    user.passwordHash = await this.bcrypt.hash(dto.newPassword);
    user.provider = AuthProvider.LOCAL;
    user.updatedAt = new Date();
    await this.repo.save(user);

    // Force re-login with new password everywhere
    await this.repo.revokeAllUserTokens(user.id);

    // Burn the OTP so it cannot be replayed
    await this.repo.invalidateOtp(otpToken.id);
  }
}
