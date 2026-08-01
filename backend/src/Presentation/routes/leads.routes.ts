import { Router } from 'express';
import { ExpaController } from '../controllers/ExpaController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Leads
 *   description: Leads retrieval endpoints
 */

/**
 * @openapi
 * /leads:
 *   get:
 *     tags: [Leads]
 *     summary: Get department leads (LEAD, CONTACTED, INTERESTED)
 *     description: |
 *       Returns EPs in the pre-approval pipeline for the caller's department.
 *       Filters are applied at the DB level for performance.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId,  schema: { type: string },  description: "VP only" }
 *       - { in: query, name: university,    schema: { type: string } }
 *       - { in: query, name: fieldOfStudy,  schema: { type: string } }
 *       - { in: query, name: product,       schema: { type: string, enum: [GV, GTA, GTE] } }
 *       - { in: query, name: createdFrom,   schema: { type: string, format: date } }
 *       - { in: query, name: createdTo,     schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: List of lead EPs
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  ExpaController.getLeads,
);

export default router;
