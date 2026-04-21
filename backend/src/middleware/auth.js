/**
 * Auth Middleware
 *
 */

import { getAuth } from '@clerk/express';
import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * Verifies Clerk session and attaches the DB user to `req.user`.
 * Returns 401 if not signed in, 404 if user hasn't onboarded yet.
 *
 * @type {import('express').RequestHandler}
 */
export const authenticate = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, 'Unauthorized — please sign in');
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { institution: { select: { id: true, name: true } } },
    });

    // User is signed into Clerk but hasn't completed onboarding
    if (!user) {
      throw new HttpError(404, 'User profile not found — complete onboarding');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control middleware factory.
 * Must be used AFTER `authenticate`.
 *
 * @param {...string} roles - Allowed role values (e.g. 'TRAINER', 'INSTITUTION')
 * @returns {import('express').RequestHandler}
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `Forbidden — requires role: ${roles.join(' or ')}`));
    }
    next();
  };
