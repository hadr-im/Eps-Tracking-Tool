import { IsString, MinLength, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName!: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;
}
