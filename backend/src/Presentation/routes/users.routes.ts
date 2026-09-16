import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { UserManagementController } from '../controllers/UserManagementController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

// All user profile routes require authentication
router.use(authMiddleware);

// GET /users/me   get current user profile
router.get('/me', UserController.getMe);

// PATCH /users/me   update fullName and/or avatarUrl
router.patch('/me', UserController.updateProfileValidation, UserController.updateProfile);

// POST /users/me/change-password   change password (LOCAL users only)
router.post(
  '/me/change-password',
  UserController.changePasswordValidation,
  UserController.changePassword,
);

/**
 * @openapi
 * /users/{memberId}/team-leader:
 *   patch:
 *     tags: [Users]
 *     summary: Assign (or unassign) a member to a Team Leader
 *     description: |
 *       Sets the `teamLeaderId` on a Member account.
 *       - **TEAM_LEADER**: can only assign members within their own department.
 *       - **VP**: can assign any member in the department.
 *       Pass `teamLeaderId: null` to unassign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *         description: ID of the member to assign
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teamLeaderId]
 *             properties:
 *               teamLeaderId:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the Team Leader, or null to unassign
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Validation error (wrong roles, different departments, etc.)
 *       403:
 *         description: Caller lacks permission
 *       404:
 *         description: Member or Team Leader not found
 */
router.patch(
  '/:memberId/team-leader',
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  UserManagementController.assignTeamLeader,
);

export default router;

