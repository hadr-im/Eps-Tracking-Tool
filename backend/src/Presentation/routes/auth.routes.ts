import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/authMiddleware';

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
 *     summary: Register a new local account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Email already in use
 */
router.post('/signup', AuthController.signupValidation, AuthController.signup);

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
router.post('/login', AuthController.loginValidation, AuthController.login);

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
router.post('/forgot-password', AuthController.forgotPasswordValidation, AuthController.forgotPassword);

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
router.post('/reset-password', AuthController.resetPasswordValidation, AuthController.resetPassword);

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
