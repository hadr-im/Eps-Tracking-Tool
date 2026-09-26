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

// ─── Static routes MUST come before /:id to avoid Express param conflicts ────

/**
 * @openapi
 * /eps:
 *   get:
 *     tags: [EPs]
 *     summary: Get EPs (role-aware)
 *     description: |
 *       - **MEMBER**: returns only their own assigned EPs.
 *       - **TL / VP**: returns all department EPs. Pass `?memberId=` to scope to one member.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: memberId,      schema: { type: string }, description: "TL/VP only — filter by member" }
 *       - { in: query, name: trackingPhase, schema: { type: string } }
 *       - { in: query, name: university,    schema: { type: string } }
 *       - { in: query, name: fieldOfStudy,  schema: { type: string } }
 *       - { in: query, name: product,       schema: { type: string, enum: [GV, GTA, GTE] } }
 *       - { in: query, name: createdFrom,   schema: { type: string, format: date } }
 *       - { in: query, name: createdTo,     schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         description: List of EPs
 *       401:
 *         description: Missing or invalid token
 */
router.get(
  '/eps',
  authMiddleware,
  roleMiddleware(UserRole.MEMBER, UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getEps,
);

/**
 * @openapi
 * /eps/under-process:
 *   get:
 *     tags: [EPs]
 *     summary: Get EPs under process (LOOKING_FOR_OPPORTUNITIES)
 *     description: |
 *       Returns all EPs in the department whose tracking phase is LOOKING_FOR_OPPORTUNITIES.
 *       Read-only — TL/VP may comment on them via POST /eps/:id/comments.
 *       **TL / VP only.**
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of EPs under process
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/eps/under-process',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getEpsUnderProcess,
);

// ─── Parameterised routes ─────────────────────────────────────────────────────

/**
 * @openapi
 * /eps/transitions:
 *   get:
 *     tags: [EPs]
 *     summary: Get transitioned EPs
 *     description: |
 *       Returns all transitioned EPs (inbound or outbound) for the caller's department.
 *       **TL / VP only.**
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transitioned EPs
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/eps/transitions',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getTransitions,
);

/**
 * @openapi
 * /eps/{id}:
 *   patch:
 *     tags: [EPs]
 *     summary: Update CRM fields on an EP
 *     description: |
 *       Partially updates the CRM fields of an EP.
 *       **MEMBER only** — and only for EPs assigned to them.
 *       TL/VP calling this endpoint will receive 403.
 *       `contactedAt` is auto-stamped server-side the first time `contacted` is set to true.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:        { type: string, nullable: true }
 *               cvLink:        { type: string, nullable: true }
 *               contacted:     { type: boolean }
 *               interested:    { type: boolean }
 *               trackingPhase: { type: string }
 *               notes:         { type: string, nullable: true }
 *               duration:      { type: string, enum: [LONG, MID, SHORT], nullable: true }
 *               availability:  { type: string, enum: [THIS_SUMMER, THIS_WINTER, NEXT_SUMMER, NEXT_WINTER], nullable: true }
 *     responses:
 *       200:
 *         description: Updated EP
 *       403:
 *         description: Not the assigned member, or caller is TL/VP
 *       404:
 *         description: EP not found
 */
router.patch(
  '/eps/:id',
  authMiddleware,
  // Any authenticated role can reach this endpoint
  // The use-case enforces that only the EP's assigned owner (ep.ownerId === caller.id) may edit
  EpController.updateEp,
);

/**
 * @openapi
 * /eps/{id}/owner:
 *   patch:
 *     tags: [EPs]
 *     summary: Reassign an EP to a different department member (TL / VP)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId]
 *             properties:
 *               memberId: { type: string }
 *     responses:
 *       200: { description: Updated EP }
 *       403: { description: Members cannot reassign, or EP outside caller's department }
 *       404: { description: EP or member not found }
 */
router.patch(
  '/eps/:id/owner',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.reassignOwner,
);

/**
 * @openapi
 * /eps/{id}/transition:
 *   post:
 *     tags: [EPs]
 *     summary: Transition EP to a new product department
 *     description: |
 *       Moves the EP to the specified product department and unassigns them.
 *       - **MEMBER**: only for EPs assigned to them.
 *       - **TEAM_LEADER**: only for EPs within their department.
 *       - **VP**: can transition any EP.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetProduct]
 *             properties:
 *               targetProduct: { type: string, enum: [GV, GTA, GTE] }
 *     responses:
 *       200:
 *         description: Transitioned EP
 *       400:
 *         description: Invalid target product or same product
 *       403:
 *         description: Not the assigned member, or caller is TL/VP
 *       404:
 *         description: EP not found
 */
router.post(
  '/eps/:id/transition',
  authMiddleware,
  roleMiddleware(UserRole.MEMBER, UserRole.TEAM_LEADER, UserRole.VP),
  EpController.transitionEp,
);

/**
 * @openapi
 * /eps/{id}/comments:
 *   post:
 *     tags: [EPs]
 *     summary: Add a comment on an EP
 *     description: |
 *       Adds a TL/VP comment on a specific EP, optionally tagged to a CRM field.
 *       **TL / VP only.**
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:   { type: string }
 *               fieldName: { type: string, nullable: true, description: "CRM field the comment relates to" }
 *     responses:
 *       201:
 *         description: Created comment
 *       400:
 *         description: Missing content
 *       403:
 *         description: Members cannot comment, or EP outside caller's department
 *       404:
 *         description: EP not found
 */
router.post(
  '/eps/:id/comments',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.addComment,
);

/**
 * @openapi
 * /eps/{id}/comments:
 *   get:
 *     tags: [EPs]
 *     summary: Get comments on an EP
 *     description: |
 *       Returns all comments for an EP, ordered oldest-first.
 *       Any authenticated user in the same department can read.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: List of comments
 *       403:
 *         description: EP outside caller's department
 *       404:
 *         description: EP not found
 */
router.get(
  '/eps/:id/comments',
  authMiddleware,
  roleMiddleware(UserRole.MEMBER, UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getComments,
);

// ─── EP listing routes (approved / realised) ──────────────────────────────────

/**
 * @openapi
 * /approved-eps:
 *   get:
 *     tags: [EPs]
 *     summary: Get approved EPs for the caller's department
 *     description: |
 *       Returns all EPs whose status is APPROVED, REALIZED, COMPLETED or FINISHED.
 *       - **TEAM_LEADER**: always scoped to their own department.
 *       - **VP**: may pass `?departmentId=` to view any department.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: string }, description: "VP only" }
 *     responses:
 *       200:
 *         description: List of approved EPs
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/approved-eps',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getApproved,
);

/**
 * @openapi
 * /realised-eps:
 *   get:
 *     tags: [EPs]
 *     summary: Get REALIZED EPs with approved details
 *     description: |
 *       Returns only EPs whose status is REALIZED, joined with ApprovedDetail.
 *       - **TEAM_LEADER**: scoped to their own department.
 *       - **VP**: may pass `?departmentId=` to view any department.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: departmentId, schema: { type: string }, description: "VP only" }
 *     responses:
 *       200:
 *         description: List of realized EPs with detail
 *       401:
 *         description: Missing or invalid access token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/realised-eps',
  authMiddleware,
  roleMiddleware(UserRole.TEAM_LEADER, UserRole.VP),
  EpController.getRealised,
);

export default router;
