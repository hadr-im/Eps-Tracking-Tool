import { Router } from 'express';
import { ManualLeadController } from '../controllers/ManualLeadController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

router.use(authMiddleware, roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP));

/**
 * @openapi
 * tags:
 *   name: ManualLeads
 *   description: Leads entered by hand rather than fetched by the EXPA sync
 */

/**
 * @openapi
 * /manual-leads:
 *   get:
 *     tags: [ManualLeads]
 *     summary: List unassigned manual leads
 *     description: |
 *       Hand-entered leads in the caller's department that have not been
 *       dispatched yet. **Team Leaders and VPs only.**
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of manual leads
 *       403:
 *         description: Caller is not a Team Leader or VP
 */
router.get('/', ManualLeadController.list);

/**
 * @openapi
 * /manual-leads/expa/{expaId}:
 *   get:
 *     tags: [ManualLeads]
 *     summary: Look up a person on EXPA to prefill the form
 *     description: |
 *       Fetches the person from EXPA and returns their details for review.
 *       Saves nothing — the user confirms before the lead is created.
 *       `alreadyExists` reports whether that EP is already in the database.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: expaId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Person found on EXPA
 *       404:
 *         description: No EXPA person with that ID
 */
router.get('/expa/:expaId', ManualLeadController.lookupExpa);

/**
 * @openapi
 * /manual-leads:
 *   post:
 *     tags: [ManualLeads]
 *     summary: Create a manual lead
 *     description: |
 *       Creates a lead in the caller's own department — department, product and
 *       status are set server-side and ignored if sent.
 *
 *       Supplying `expaId` keeps the real EXPA id as the record id, so the
 *       hourly status sync tracks the lead like any other EP. Without one, a
 *       prefixed id is generated that cannot collide with a real EXPA person.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName]
 *             properties:
 *               expaId:       { type: string, nullable: true }
 *               fullName:     { type: string }
 *               email:        { type: string, nullable: true }
 *               phone:        { type: string, nullable: true }
 *               university:   { type: string, nullable: true }
 *               fieldOfStudy: { type: string, nullable: true }
 *               yearOfStudy:  { type: integer, nullable: true }
 *               source:       { type: string, nullable: true }
 *               cvLink:       { type: string, nullable: true }
 *               notes:        { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Lead created
 *       400:
 *         description: Missing full name, or a non-numeric EXPA ID
 *       409:
 *         description: That EP is already in the system
 */
router.post('/', ManualLeadController.create);

export default router;
