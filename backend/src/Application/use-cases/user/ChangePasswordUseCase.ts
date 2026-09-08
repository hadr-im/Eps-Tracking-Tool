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

    // Google-only users cannot change password here (they have no passwordHash)
    if (user.provider === AuthProvider.GOOGLE && !user.passwordHash) {
      throw new AppError(
        'Google-authenticated accounts cannot change their password here. Use "Forgot password" to set one.',
        403,
      );
    }

    // Verify current password
    const isValid = await this.bcrypt.compare(dto.currentPassword, user.passwordHash!);
    if (!isValid) throw new AppError('Current password is incorrect', 400);

    // Hash and save new password
    user.passwordHash = await this.bcrypt.hash(dto.newPassword);
    user.updatedAt = new Date();
    await this.repo.save(user);

    // Revoke all refresh tokens -> force re-login on other devices
    await this.repo.revokeAllUserTokens(userId);
  }
}
