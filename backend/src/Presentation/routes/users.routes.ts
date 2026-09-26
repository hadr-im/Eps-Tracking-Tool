import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { UserManagementController } from '../controllers/UserManagementController';
import { AccountApprovalController } from '../controllers/AccountApprovalController';
import { MemberManagementController } from '../controllers/MemberManagementController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

// All user profile routes require authentication
router.use(authMiddleware);

// GET /users/me   get current user profile
router.get('/me', UserController.getMe);

/**
 * @openapi
 * /users/pending:
 *   get:
 *     tags: [Users]
 *     summary: Signup requests awaiting review
 *     description: |
 *       VP only. Returns PENDING accounts that applied to the caller's own
 *       department, oldest first. Each carries a `requested` object describing
 *       the role, department, Team Leader and dispatcher flag the applicant
 *       asked for — none of which has been granted.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending accounts
 *       403:
 *         description: Caller is not a VP
 */
router.get('/pending', roleMiddleware(UserRole.VP), AccountApprovalController.listPending);

/**
 * @openapi
 * /users/members:
 *   get:
 *     tags: [Users]
 *     summary: Everyone approved into the caller's department
 *     description: VP only. Includes disabled accounts so they can be re-enabled.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department members
 *       403:
 *         description: Caller is not a VP
 */
router.get('/members', roleMiddleware(UserRole.VP), MemberManagementController.list);

/**
 * @openapi
 * /users/{id}/access:
 *   patch:
 *     tags: [Users]
 *     summary: Change an approved member's role, team, dispatcher flag or status
 *     description: |
 *       VP only. Covers what happens after someone joins: promotions, handing
 *       over the dispatcher role, moving between teams, and disabling people
 *       who have left.
 *
 *       Every field is optional; omitting one leaves it unchanged. The
 *       one-dispatcher and one-VP rules are enforced here too. A VP cannot
 *       change their own access, and nobody can be promoted to VP here — the
 *       incoming VP signs up with the VP setup code.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:         { type: string, enum: [MEMBER, TEAM_LEADER] }
 *               teamLeaderId: { type: string, nullable: true }
 *               isDispatcher: { type: boolean }
 *               isDisabled:   { type: boolean }
 *     responses:
 *       200:
 *         description: Access updated
 *       403:
 *         description: Not a VP, another department, own account, or a VP target
 *       404:
 *         description: Member not found
 *       409:
 *         description: The dispatcher slot is already taken
 */
router.patch('/:id/access', roleMiddleware(UserRole.VP), MemberManagementController.updateAccess);

/**
 * @openapi
 * /users/{id}/approve:
 *   post:
 *     tags: [Users]
 *     summary: Approve a signup request
 *     description: |
 *       VP only. Grants access and flips the account to ACTIVE. This is the
 *       only endpoint in the system that grants privileges.
 *
 *       Any field in the body overrides what the applicant requested, so a VP
 *       can correct a wrong self-selection before approving. Omit the body
 *       entirely to approve exactly what was asked for.
 *
 *       Rejected with 409 when the department already has a VP or a dispatcher.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:         { type: string, enum: [MEMBER, TEAM_LEADER, VP] }
 *               departmentId: { type: string }
 *               teamLeaderId: { type: string, nullable: true }
 *               isDispatcher: { type: boolean }
 *     responses:
 *       200:
 *         description: Account approved
 *       403:
 *         description: Caller is not a VP, or the request is for another department
 *       404:
 *         description: Account not found
 *       409:
 *         description: Already reviewed, or the department already has a VP or dispatcher
 */
router.post('/:id/approve', roleMiddleware(UserRole.VP), AccountApprovalController.approve);

/**
 * @openapi
 * /users/{id}/reject:
 *   post:
 *     tags: [Users]
 *     summary: Decline a signup request
 *     description: VP only. The reason is shown to the applicant if they try to sign in.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Account rejected
 *       403:
 *         description: Caller is not a VP, or the request is for another department
 *       404:
 *         description: Account not found
 *       409:
 *         description: Already reviewed
 */
router.post('/:id/reject', roleMiddleware(UserRole.VP), AccountApprovalController.reject);

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

