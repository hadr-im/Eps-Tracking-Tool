import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { UserMapper, UserResponse } from '../../mappers/UserMapper';
import { AppError } from '../../errors/AppError';
import type { UpdateProfileDto } from '../../dtos/user/UpdateProfileDto';

export class UpdateProfileUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.isDisabled) throw new AppError('Account is disabled', 403);

    // Only fullName and avatarUrl are editable 
    user.fullName = dto.fullName.trim();
    user.avatarUrl = dto.avatarUrl?.trim() ?? user.avatarUrl;
    user.updatedAt = new Date();

    const saved = await this.repo.save(user);
    return UserMapper.toResponse(saved);
  }
}
