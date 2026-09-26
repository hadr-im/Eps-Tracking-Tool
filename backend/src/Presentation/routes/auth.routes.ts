import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiters';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication and session management
 */

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Request a new local account
 *     description: |
 *       Creates a **PENDING** account. The `requested*` fields record what the
 *       applicant asked for — they grant nothing. The account holds no role and
 *       no department until a VP approves it via `POST /users/{id}/approve`,
 *       and cannot sign in before then.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Request submitted, awaiting VP approval
 *       400:
 *         description: Validation error, or an invalid department / Team Leader
 *       409:
 *         description: Email already in use, or the department already has a VP or dispatcher
 */
router.post('/signup', authRateLimiter, AuthController.signupValidation, AuthController.signup);

/**
 * @openapi
 * /auth/complete-signup:
 *   post:
 *     tags: [Auth]
 *     summary: Finish a Google signup (step 2)
 *     description: |
 *       Creates the PENDING account for a Google profile that has no account
 *       yet. Identity comes from `setupToken`, a short-lived token minted by
 *       the OAuth callback — no user row exists until this succeeds.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [setupToken, requestedRole, requestedDepartmentId]
 *             properties:
 *               setupToken: { type: string }
 *               requestedRole: { type: string, enum: [MEMBER, TEAM_LEADER, VP] }
 *               requestedDepartmentId: { type: string }
 *               requestedTeamLeaderId: { type: string, nullable: true }
 *               requestedIsDispatcher: { type: boolean }
 *     responses:
 *       201:
 *         description: Request submitted, awaiting VP approval
 *       401:
 *         description: Setup token missing, invalid or expired
 *       409:
 *         description: An account already exists for this Google profile or email
 */
router.post(
  '/complete-signup',
  authRateLimiter,
  AuthController.completeGoogleSignupValidation,
  AuthController.completeGoogleSignup,
);

/**
 * @openapi
 * /auth/signup-options/departments:
 *   get:
 *     tags: [Auth]
 *     summary: Departments available on the signup form
 *     description: Public — the caller has no account yet.
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get('/signup-options/departments', AuthController.getDepartments);

/**
 * @openapi
 * /auth/signup-options/departments/{id}/team-leaders:
 *   get:
 *     tags: [Auth]
 *     summary: Team Leaders a new member can select at signup
 *     description: |
 *       Public — the caller has no account yet. Returns id and full name only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of Team Leaders
 *       404:
 *         description: Department not found
 */
router.get(
  '/signup-options/departments/:id/team-leaders',
  AuthController.getTeamLeaders,
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Returns accessToken; refreshToken set as httpOnly cookie
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, AuthController.loginValidation, AuthController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and get a new access token
 *     responses:
 *       200:
 *         description: New accessToken returned; new refreshToken set in cookie
 *       401:
 *         description: Missing, revoked, or expired refresh token
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke refresh token and clear cookie
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authMiddleware, AuthController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get currently logged in user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, AuthController.me);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a 6-digit OTP for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Silent success (no email enumeration)
 */
router.post('/forgot-password', authRateLimiter, AuthController.forgotPasswordValidation, AuthController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using email + OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password updated; all sessions revoked
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/reset-password', authRateLimiter, AuthController.resetPasswordValidation, AuthController.resetPassword);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth flow (redirect to Google)
 *     responses:
 *       302:
 *         description: Redirects to Google consent screen
 */
router.get('/google', AuthController.googleRedirect);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback — issues tokens and redirects to frontend
 *     responses:
 *       302:
 *         description: Redirects to frontend with accessToken in query param
 */
router.get('/google/callback', AuthController.googleCallbackMiddleware, AuthController.googleCallback);

export default router;
