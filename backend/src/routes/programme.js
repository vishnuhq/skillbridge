/**
 * Programme Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

import { getProgrammeSummary } from '../controllers/summary.controller.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  requireRole('PROGRAMME_MANAGER', 'MONITORING_OFFICER'),
  getProgrammeSummary
);

export default router;
