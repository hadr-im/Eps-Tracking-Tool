import { Request, Response } from 'express';
import { authUseCase, updateProfileUseCase, changePasswordUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { validateDto } from '../middlewares/validate';
import { UpdateProfileDto } from '../../Application/dtos/user/UpdateProfileDto';
import { ChangePasswordDto } from '../../Application/dtos/user/ChangePasswordDto';

// Error handler (mirrors AuthController pattern)
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export class UserController {
  // GET /users/me  returns the current user's full profile
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await authUseCase.getMe(req.user!.id);
      res.status(200).json(user);
    } catch (err) {
      handleError(res, err);
    }
  }

  // PATCH /users/me  updates fullName and avatarUrl only
  static updateProfileValidation = validateDto(UpdateProfileDto);
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await updateProfileUseCase.execute(req.user!.id, req.body as UpdateProfileDto);
      res.status(200).json(user);
    } catch (err) {
      handleError(res, err);
    }
  }

  // POST /users/me/change-password
  static changePasswordValidation = validateDto(ChangePasswordDto);
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      await changePasswordUseCase.execute(req.user!.id, req.body as ChangePasswordDto);
      res.status(200).json({
        message: 'Password changed successfully. Other sessions have been logged out.',
      });
    } catch (err) {
      handleError(res, err);
    }
  }
}
