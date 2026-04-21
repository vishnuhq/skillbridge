/**
 * Institution Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

import { getInstitutionSummary } from '../controllers/summary.controller.js';

const router = Router();

router.get('/:id/summary', authenticate, requireRole('PROGRAMME_MANAGER'), getInstitutionSummary);

export default router;
