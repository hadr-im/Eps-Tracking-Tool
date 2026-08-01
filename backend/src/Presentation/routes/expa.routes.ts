import { Router } from 'express';
import { ExpaController } from '../controllers/ExpaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: EXPA
 *   description: EXPA synchronisation and EP listing endpoints
 */

/**
 * @openapi
 * /expa/sync:
 *   post:
 *     tags: [EXPA]
 *     summary: Manual sync for the caller's department
 *     description: |
 *       Triggers a leads + status sync immediately for the TL/VP's own department.
 *       Reads `departmentId` from the JWT token — no body required.
 *       Useful when the TL doesn't want to wait for the scheduled midnight/15-min cron jobs.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed — returns counts of changes made
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     newLeads:              { type: integer }
 *                     statusChanges:         { type: integer }
 *                     approvedDetailsCreated: { type: integer }
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.post(
  '/sync',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  ExpaController.manualSync,
);




export default router;

