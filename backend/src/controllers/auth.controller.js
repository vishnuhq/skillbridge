/**
 * Auth Controller
 *
 * Handles:
 *   GET  /auth/me        — get current user (used on every app load)
 *   POST /auth/sync      — create DB user after Clerk sign-up (onboarding)
 *   GET  /public/institutions — public list for the onboarding dropdown
 */

import { getAuth } from '@clerk/express';
import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * GET /auth/me
 * Returns the authenticated user's profile + institution.
 * Returns 404 if not onboarded yet (frontend redirects to /onboarding).
 */
export const getMe = async (req, res, next) => {
  try {
    // `req.user` is already set by the `authenticate` middleware
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/sync
 * Called once after Clerk sign-up to create the local DB user record.
 * Body: { name, role, institutionId?, institutionName? }
 */
export const syncProfile = async (req, res, next) => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) throw new HttpError(401, 'Unauthorized');

    // Idempotent: if user already exists, just return it
    const existing = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { institution: { select: { id: true, name: true } } },
    });

    if (existing) {
      return res.json({ user: existing });
    }

    const { name, role, institutionId, institutionName } = req.validated;

    const user = await prisma.$transaction(async (tx) => {
      let resolvedInstitutionId = institutionId ?? null;

      // INSTITUTION role can create a new institution on the fly
      if (role === 'INSTITUTION' && !institutionId && institutionName) {
        const created = await tx.institution.create({
          data: { name: institutionName },
        });
        resolvedInstitutionId = created.id;
      }

      return tx.user.create({
        data: {
          clerkUserId,
          name,
          role,
          institutionId: resolvedInstitutionId,
        },
        include: { institution: { select: { id: true, name: true } } },
      });
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /public/institutions
 * Unauthenticated — used by the onboarding form dropdown.
 */
export const getPublicInstitutions = async (req, res, next) => {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    res.json({ institutions });
  } catch (err) {
    next(err);
  }
};
