import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Installation-wide diagnostics, owner only
 */

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Data completion across the LC, and EXPA request volume
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completion rollups, rankings, every person, EXPA usage
 *       403:
 *         description: Not an admin
 */
router.get(
  '/dashboard',
  authMiddleware,
  // The use case checks this too. Keeping both means the boundary survives
  // the route being remounted somewhere that forgets the guard.
  roleMiddleware(UserRole.ADMIN),
  AdminController.getDashboard,
);

export default router;
