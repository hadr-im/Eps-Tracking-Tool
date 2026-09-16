import { Router } from 'express';
import { DepartmentController } from '../controllers/DepartmentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Departments
 *   description: Department management endpoints
 */

/**
 * @openapi
 * /departments/{id}/members:
 *   get:
 *     tags: [Departments]
 *     summary: Get active members of a department
 *     description: |
 *       Returns active members of the given department.
 *       - **TEAM_LEADER**: scoped only to members assigned to this TL.
 *       - **VP**: returns all active members of the department.
 *       Both are restricted to their own department.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Department ID
 *     responses:
 *       200:
 *         description: List of active department members
 *       403:
 *         description: TL attempting to view a different department
 *       401:
 *         description: Missing or invalid token
 */
router.get(
  '/:id/members',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  DepartmentController.getMembers,
);

export default router;
