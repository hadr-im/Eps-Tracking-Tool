import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { configureGoogleStrategy } from './Infrastructure/oauth/GoogleStrategy';
import { swaggerSpec } from './swagger';
import routes from './Presentation/routes';
import { apiRateLimiter } from './Presentation/middlewares/rateLimiters';

dotenv.config();

// Register Passport strategies before routes are mounted
configureGoogleStrategy();

const app = express();

// Rate limiting and secure cookies both need the real client IP / protocol,
// which on a managed host arrives via X-Forwarded-* rather than the socket.
app.set('trust proxy', 1);

// Global middleware
app.use(helmet());
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  credentials: true, // required for httpOnly cookies across origins
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize()); // stateless — no session

// API docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
// The limiter is mounted before the routes so it covers every endpoint,
// including ones added later. Stricter per-endpoint limits live in the route files.
app.use('/api', apiRateLimiter, routes);

export default app;
