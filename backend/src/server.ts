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

dotenv.config();

// Register Passport strategies before routes are mounted
configureGoogleStrategy();

const app = express();
const PORT = process.env['PORT'] ?? 4000;

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
app.use('/api', routes);

// Start 
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs  http://localhost:${PORT}/api/docs`);
});

export default app;