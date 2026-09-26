import { IsOptional, IsString, MinLength } from 'class-validator';

/*
  Two shapes on one endpoint:

    - LOCAL accounts sending both `currentPassword` and `newPassword` change
      their password; the current one is verified before the new one is set.
    - Google-only accounts (no passwordHash yet) omit `currentPassword` and
      set their first one — the use case rejects the same call once a
      password is already on the account.
*/
export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword!: string;
}
