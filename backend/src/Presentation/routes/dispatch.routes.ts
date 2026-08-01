import { Router } from 'express';
import { DispatchController } from '../controllers/DispatchController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { UserRole } from '../../Domain/enums/UserRole';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Dispatch
 *   description: Lead dispatching 
 */

/**
 * @openapi
 * /dispatch/pool:
 *   get:
 *     tags: [Dispatch]
 *     summary: Get unassigned leads pool for the caller's department
 *     description: |
 *       Returns EPs that have not yet been assigned to any member (ownerId = null).
 *       Scoped to the dispatcher's department. All filters run server-side.
 *       **TL with isDispatcher = true only.**
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: product,      schema: { type: string, enum: [GV, GTA, GTE] } }
 *       - { in: query, name: status,       schema: { type: string }, description: "EpStatus value" }
 *       - { in: query, name: university,   schema: { type: string } }
 *       - { in: query, name: fieldOfStudy, schema: { type: string } }
 *       - { in: query, name: createdFrom,  schema: { type: string, format: date } }
 *       - { in: query, name: createdTo,    schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: List of unassigned EPs
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Not a dispatcher TL
 */
router.get(
  '/pool',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER),
  DispatchController.getLeadsPool,
);

/**
 * @openapi
 * /dispatch:
 *   post:
 *     tags: [Dispatch]
 *     summary: Assign EPs to a member
 *     description: |
 *       Dispatches one or more unassigned EPs to a member of the same department.
 *       `assignedAt` is stamped by the server — do not send it in the body.
 *       **TL with isDispatcher = true only.**
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [epIds, memberId]
 *             properties:
 *               epIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: IDs of the EPs to assign (must be unassigned)
 *               memberId:
 *                 type: string
 *                 description: ID of the member to assign them to
 *     responses:
 *       200:
 *         description: EPs assigned — returns the updated EP list
 *       400:
 *         description: Validation error (empty epIds, missing memberId)
 *       403:
 *         description: Caller is not a dispatcher TL, or member is from another department
 *       404:
 *         description: Member not found in department
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER),
  DispatchController.dispatch,
);


export default router;

