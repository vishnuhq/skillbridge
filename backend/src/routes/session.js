/**
 * Session Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

import { createSessionSchema } from '../validators/index.js';

import {
  createSession,
  getSessionAttendance,
  getSessions,
} from '../controllers/session.controller.js';

const router = Router();

router.get('/', authenticate, requireRole('TRAINER', 'STUDENT'), getSessions);

router.post(
  '/',
  authenticate,
  requireRole('TRAINER'),
  validate(createSessionSchema),
  createSession
);

router.get('/:id/attendance', authenticate, requireRole('TRAINER'), getSessionAttendance);

export default router;
