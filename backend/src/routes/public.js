/**
 * Public Routes
 */

import { Router } from 'express';

import { getPublicInstitutions } from '../controllers/auth.controller.js';

const router = Router();

router.get('/institutions', getPublicInstitutions);

export default router;
