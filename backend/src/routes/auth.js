/**
 * Auth Routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

import { syncSchema } from '../validators/index.js';

import { getMe, syncProfile } from '../controllers/auth.controller.js';

const router = Router();

router.post('/sync', validate(syncSchema), syncProfile);

router.get('/me', authenticate, getMe);

export default router;
