/**
 * Batch Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

import { createBatchSchema, createInviteSchema, joinBatchSchema } from '../validators/index.js';

import {
  createBatch,
  createInvite,
  getBatchSummary,
  getBatches,
  joinBatch,
} from '../controllers/batch.controller.js';

const router = Router();

router.get('/', authenticate, requireRole('INSTITUTION', 'TRAINER'), getBatches);

router.post(
  '/',
  authenticate,
  requireRole('TRAINER', 'INSTITUTION'),
  validate(createBatchSchema),
  createBatch
);

router.post(
  '/:id/invite',
  authenticate,
  requireRole('TRAINER'),
  validate(createInviteSchema),
  createInvite
);

router.post(
  '/:id/join',
  authenticate,
  requireRole('STUDENT'),
  validate(joinBatchSchema),
  joinBatch
);

router.get('/:id/summary', authenticate, requireRole('INSTITUTION'), getBatchSummary);

export default router;
