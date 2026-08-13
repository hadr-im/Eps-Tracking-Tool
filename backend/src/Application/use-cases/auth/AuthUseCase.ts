import crypto from 'crypto';
import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { IMailService } from '../../abstracts/IMailService';
import { RefreshToken } from '../../../Domain/entities/RefreshToken';
import { OtpToken } from '../../../Domain/entities/OtpToken';
import { AuthProvider } from '../../../Domain/enums/AuthProvider';
import { BcryptService } from '../../../Infrastructure/services/BcryptService';
import { JwtService } from '../../../Infrastructure/jwt/JwtService';
import { UserMapper, UserResponse } from '../../mappers/UserMapper';
import { AppError } from '../../errors/AppError';
import type { SignupDto } from '../../dtos/auth/SignupDto';
import type { LoginDto } from '../../dtos/auth/LoginDto';
import type { GoogleProfileDto } from '../../dtos/auth/GoogleProfileDto';
import type { ForgotPasswordDto } from '../../dtos/auth/ForgotPasswordDto';
import type { ResetPasswordDto } from '../../dtos/auth/ResetPasswordDto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends AuthTokens {
  user: UserResponse;
}

const OTP_EXPIRY_MINUTES = 10;

export class AuthUseCase {
  constructor(
    private readonly repo: IAuthRepository,
    private readonly bcrypt: BcryptService,
    private readonly jwt: JwtService,
    private readonly mail: IMailService,
  ) {}

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

  // Signup 

  async signup(dto: SignupDto): Promise<UserResponse> {
    const existing = await this.repo.findByEmail(dto.email.toLowerCase());
    if (existing) throw new AppError('Email already in use', 409);

    const passwordHash = await this.bcrypt.hash(dto.password);
    const user = UserMapper.fromSignupDto(dto, passwordHash);
    const saved = await this.repo.save(user);

    return UserMapper.toResponse(saved);
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

    if (user.isDisabled) throw new AppError('Account is disabled', 403);

    const valid = await this.bcrypt.compare(dto.password, user.passwordHash!);
    if (!valid) throw new AppError('Invalid credentials', 401);

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

    // Reload user to pick up any role/department changes since last login
    const user = await this.repo.findById(payload.userId);
    if (!user) throw new AppError('User not found', 401);
    if (user.isDisabled) throw new AppError('Account is disabled', 403);

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
    if (user.isDisabled) throw new AppError('Account is disabled', 403);
    return UserMapper.toResponse(user);
  }

  // Google OAuth 

  async googleAuth(profile: GoogleProfileDto): Promise<LoginResult> {
    let user = await this.repo.findByGoogleId(profile.googleId);

    if (!user) {
      // Email already registered locally? Link the Google account to it.
      user = await this.repo.findByEmail(profile.email.toLowerCase()) ?? null;

      if (user) {
        user.googleId = profile.googleId;
        user.provider = AuthProvider.GOOGLE;
        user.updatedAt = new Date();
        user = await this.repo.save(user);
      } else {
        // Brand new user — create from Google profile
        const newUser = UserMapper.fromGoogleProfile(profile);
        user = await this.repo.save(newUser);
      }
    }

    if (user.isDisabled) throw new AppError('Account is disabled', 403);

    const tokens = await this.issueTokenPair(user.id, user.role, user.departmentId, user.isDispatcher);
    return { ...tokens, user: UserMapper.toResponse(user) };
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
