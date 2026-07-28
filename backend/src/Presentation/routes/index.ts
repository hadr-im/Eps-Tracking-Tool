import { Router } from 'express';
import authRoutes from './auth.routes';
import epRoutes from './ep.routes';
import expaRoutes from './expa.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/eps', epRoutes);
router.use('/expa', expaRoutes);

export default router;