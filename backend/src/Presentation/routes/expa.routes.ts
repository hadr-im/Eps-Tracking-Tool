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

/**
 * @openapi
 * /expa/approved-eps:
 *   get:
 *     tags: [EXPA]
 *     summary: Get approved EPs (APPROVED, REALIZED, COMPLETED, FINISHED) with details
 *     description: |
 *       Returns EPs at or beyond APPROVED status, joined with their ApprovedDetail.
 *       Filters are applied in the DB (not in-memory) for performance at scale.
 *       - **TEAM_LEADER**: always scoped to their own department.
 *       - **VP**: may pass `?departmentId=` to view any department.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId,  schema: { type: string },  description: "VP only" }
 *       - { in: query, name: university,    schema: { type: string },  description: "Filter by university" }
 *       - { in: query, name: fieldOfStudy,  schema: { type: string },  description: "Filter by field of study" }
 *       - { in: query, name: product,       schema: { type: string, enum: [GV, GTA, GTE] } }
 *       - { in: query, name: hostingMC,     schema: { type: string },  description: "Filter by hosting Member Committee" }
 *       - { in: query, name: hostingLC,     schema: { type: string },  description: "Filter by hosting Local Committee" }
 *       - { in: query, name: createdFrom,   schema: { type: string, format: date }, description: "EXPA registration from (ISO)" }
 *       - { in: query, name: createdTo,     schema: { type: string, format: date }, description: "EXPA registration to (ISO)" }
 *     responses:
 *       200:
 *         description: List of approved EPs with detail
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/approved-eps',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  ExpaController.getApprovedEps,
);

/**
 * @openapi
 * /expa/realised-eps:
 *   get:
 *     tags: [EXPA]
 *     summary: Get REALIZED EPs with approved details
 *     description: |
 *       Returns only EPs whose status is REALIZED, joined with ApprovedDetail.
 *       Supports the same filters as /approved-eps.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId,  schema: { type: string },  description: "VP only" }
 *       - { in: query, name: university,    schema: { type: string } }
 *       - { in: query, name: fieldOfStudy,  schema: { type: string } }
 *       - { in: query, name: product,       schema: { type: string, enum: [GV, GTA, GTE] } }
 *       - { in: query, name: hostingMC,     schema: { type: string } }
 *       - { in: query, name: hostingLC,     schema: { type: string } }
 *       - { in: query, name: createdFrom,   schema: { type: string, format: date } }
 *       - { in: query, name: createdTo,     schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: List of realized EPs
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/realised-eps',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  ExpaController.getRealisedEps,
);

/**
 * @openapi
 * /expa/leads:
 *   get:
 *     tags: [EXPA]
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
  '/leads',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  ExpaController.getLeads,
);

export default router;
