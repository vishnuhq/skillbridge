/**
 * Institution Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

import { getInstitutionTrainers } from '../controllers/batch.controller.js';
import { getInstitutionSummary } from '../controllers/summary.controller.js';

const router = Router();

router.get('/:id/summary', authenticate, requireRole('PROGRAMME_MANAGER'), getInstitutionSummary);

router.get('/trainers', authenticate, requireRole('INSTITUTION'), getInstitutionTrainers);

export default router;
