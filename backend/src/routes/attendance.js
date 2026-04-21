/**
 * Attendance Routes
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

import { markAttendanceSchema } from '../validators/index.js';

import { markAttendance } from '../controllers/attendance.controller.js';

const router = Router();

router.post(
  '/mark',
  authenticate,
  requireRole('STUDENT'),
  validate(markAttendanceSchema),
  markAttendance
);

export default router;
