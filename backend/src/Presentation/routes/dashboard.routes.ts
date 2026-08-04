import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Dashboard
 *   description: Analytics and aggregated metrics
 */

/**
 * @openapi
 * /dashboard/me:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get personal dashboard stats
 *     description: Returns funnel, phases, and conversion rates for the logged-in user's assigned EPs. If caller is TL/VP, includes member breakdown.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get(
  '/me',
  authMiddleware,
  DashboardController.getMyDashboard,
);


/**
 * @openapi
 * /dashboard/department:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get full department dashboard stats
 *     description: Returns total pipeline stats, member leaderboard, trends, and transition stats. **VP only.**
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: string }, description: "Optional: view a different department" }
 *       - { in: query, name: months, schema: { type: integer, default: 6 }, description: "Optional: how many months of trends to fetch" }
 *     responses:
 *       200:
 *         description: VP dashboard statistics
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/department',
  authMiddleware,
  roleMiddleware(UserRole.VP),
  DashboardController.getVpDashboard,
);

/**
 * @openapi
 * /dashboard/member/{id}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get a specific member's dashboard stats
 *     description: Returns the same stats as `/dashboard/me`, but for the specified user. **TL / VP only.**
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Member dashboard statistics
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/member/:id',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  DashboardController.getMemberDashboard,
);

export default router;
