import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { BcryptService } from '../../../Infrastructure/services/BcryptService';
import { AuthProvider } from '../../../Domain/enums/AuthProvider';
import { AppError } from '../../errors/AppError';
import type { ChangePasswordDto } from '../../dtos/user/ChangePasswordDto';

export class ChangePasswordUseCase {
  constructor(
    private readonly repo: IAuthRepository,
    private readonly bcrypt: BcryptService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.isDisabled) throw new AppError('Account is disabled', 403);

    /*
      Google-only accounts have no password yet, so they can set one here
      without providing a "current" — that's the first-time-set flow. Every
      other call must include the current password, and it must match.

      Never accept an empty current password on an account that already has
      one: it would let anyone with a stolen access token overwrite the
      password without knowing the old one.
    */
    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new AppError('Current password is required', 400);
      }
      const isValid = await this.bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isValid) throw new AppError('Current password is incorrect', 400);
    }

    // Hash and save new password
    user.passwordHash = await this.bcrypt.hash(dto.newPassword);
    // A Google-only account picks up a password here — mark it LOCAL so the
    // regular sign-in flow works from now on.
    if (user.provider === AuthProvider.GOOGLE) {
      user.provider = AuthProvider.LOCAL;
    }
    user.updatedAt = new Date();
    await this.repo.save(user);

    // Revoke all refresh tokens -> force re-login on other devices
    await this.repo.revokeAllUserTokens(userId);
  }
}
