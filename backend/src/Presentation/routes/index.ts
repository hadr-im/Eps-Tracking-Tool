import { Router } from 'express';
import authRoutes from './auth.routes';
import epRoutes from './ep.routes';
import expaRoutes from './expa.routes';
import dispatchRoutes from './dispatch.routes';
import leadsRoutes from './leads.routes';
import departmentsRoutes from './departments.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/auth',     authRoutes);
router.use('/',         epRoutes);
router.use('/expa',     expaRoutes);
router.use('/dispatch',    dispatchRoutes);
router.use('/leads',       leadsRoutes);
router.use('/departments', departmentsRoutes);
router.use('/dashboard',   dashboardRoutes);

export default router;