import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All user profile routes require authentication
router.use(authMiddleware);

// GET /users/me  get current user profile
router.get('/me', UserController.getMe);

// PATCH /users/me  update fullName and/or avatarUrl
router.patch('/me', UserController.updateProfileValidation, UserController.updateProfile);

// POST /users/me/change-password  change password (LOCAL users only)
router.post(
  '/me/change-password',
  UserController.changePasswordValidation,
  UserController.changePassword,
);

export default router;
