import { Router } from 'express';
import { EpController } from '../controllers/EpController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: EPs
 *   description: Exchange Participant management
 */

/**
 * @openapi
 * /eps/approved:
 *   get:
 *     tags: [EPs]
 *     summary: Get approved EPs for the caller's department
 *     description: |
 *       Returns all EPs whose status is APPROVED, REALIZED, COMPLETED or FINISHED.
 *       - **TEAM_LEADER / MEMBER**: always scoped to their own department (from JWT).
 *       - **VP**: may pass `?departmentId=` to view any department.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         required: false
 *         description: Target department ID (VP only — ignored for other roles)
 *     responses:
 *       200:
 *         description: List of approved EPs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApprovedEpDto'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/approved',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getApproved,
);

export default router;
