/**
 * Batch Controller
 *
 * Endpoints:
 *   GET  /batches                — list batches (INSTITUTION sees all theirs, TRAINER sees assigned only)
 *   POST /batches                — create batch (TRAINER or INSTITUTION)
 *   POST /batches/:id/invite     — generate invite link (TRAINER assigned to batch)
 *   POST /batches/:id/join       — student joins via invite token (STUDENT)
 *   POST /batches/:id/trainers   — assign trainer to batch (INSTITUTION)
 *   GET  /batches/:id/summary    — attendance summary for a batch (INSTITUTION)
 *   GET  /institution/trainers   — list all trainers in institution (INSTITUTION)
 */

import { isSessionEnded, syncSessionAbsencesIfEnded } from '../lib/attendanceLifecycle.js';
import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

// GET /batches

/**
 * Returns batches scoped to the caller's role:
 *  - INSTITUTION → all batches they own, with trainer list and counts
 *  - TRAINER     → only batches they are assigned to, with counts
 */
export const getBatches = async (req, res, next) => {
  try {
    const { role, id: userId, institutionId } = req.user;

    if (role === 'INSTITUTION') {
      if (!institutionId) throw new HttpError(400, 'You are not linked to an institution');

      const batches = await prisma.batch.findMany({
        where: { institutionId },
        include: {
          trainers: {
            include: { trainer: { select: { id: true, name: true } } },
          },
          _count: { select: { students: true, sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ batches });
    }

    if (role === 'TRAINER') {
      const links = await prisma.batchTrainer.findMany({
        where: { trainerId: userId },
        include: {
          batch: {
            include: {
              _count: { select: { students: true, sessions: true } },
            },
          },
        },
      });

      const batches = links.map((l) => l.batch);
      return res.json({ batches });
    }

    throw new HttpError(403, 'Forbidden');
  } catch (err) {
    next(err);
  }
};

// POST /batches

/**
 * Creates a batch under the caller's institution.
 * If the caller is a TRAINER, they are auto-assigned to the batch so they can
 * immediately create sessions and generate invite links.
 *
 * Request body: { name: string }
 * Response 201: { batch: { id, name, institutionId, createdAt, institution: {id, name} } }
 */
export const createBatch = async (req, res, next) => {
  try {
    const { name } = req.validated;
    const { institutionId, role, id: userId } = req.user;

    if (!institutionId) {
      throw new HttpError(400, 'You must belong to an institution to create a batch');
    }

    const batch = await prisma.batch.create({
      data: { name, institutionId },
      include: {
        institution: { select: { id: true, name: true } },
        trainers: {
          include: { trainer: { select: { id: true, name: true } } },
        },
        _count: { select: { students: true, sessions: true } },
      },
    });

    // Trainer auto-assigned so they can use the batch immediately
    if (role === 'TRAINER') {
      await prisma.batchTrainer.create({
        data: { batchId: batch.id, trainerId: userId },
      });

      // Re-fetch to include the newly created trainer relation in response
      const withTrainer = await prisma.batch.findUnique({
        where: { id: batch.id },
        include: {
          institution: { select: { id: true, name: true } },
          trainers: {
            include: { trainer: { select: { id: true, name: true } } },
          },
          _count: { select: { students: true, sessions: true } },
        },
      });

      return res.status(201).json({ batch: withTrainer });
    }

    res.status(201).json({ batch });
  } catch (err) {
    next(err);
  }
};

// POST /batches/:id/trainers

/**
 * Institution assigns an existing trainer to a batch.
 * Both the batch and the trainer must belong to the same institution.
 *
 * Request body: { trainerId: string }
 * Response 201: { message: 'Trainer assigned successfully' }
 * Errors:
 *   400 — batch doesn't belong to this institution
 *   404 — trainer not found
 *   409 — trainer already assigned to this batch
 */
export const assignTrainer = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;
    const { trainerId } = req.validated;
    const { institutionId } = req.user;

    // Verify the batch belongs to this institution
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new HttpError(404, 'Batch not found');
    if (batch.institutionId !== institutionId) {
      throw new HttpError(403, 'This batch does not belong to your institution');
    }

    // Verify the trainer exists and belongs to the same institution
    const trainer = await prisma.user.findUnique({ where: { id: trainerId } });
    if (!trainer) throw new HttpError(404, 'Trainer not found');
    if (trainer.role !== 'TRAINER') throw new HttpError(400, 'User is not a Trainer');
    if (trainer.institutionId !== institutionId) {
      throw new HttpError(400, 'Trainer does not belong to your institution');
    }

    // Check for duplicate
    const existing = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId, trainerId } },
    });
    if (existing) throw new HttpError(409, 'Trainer is already assigned to this batch');

    await prisma.batchTrainer.create({ data: { batchId, trainerId } });

    res.status(201).json({ message: 'Trainer assigned successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /batches/:id/invite

/**
 * Trainer generates an invite link for students to join a batch.
 * The trainer must be assigned to the batch.
 *
 * Request body: { type?: 'ONE_TIME' | 'REUSABLE', expiresAt?: ISO datetime string }
 * Response 201: { invite: {...}, inviteUrl: string }
 *   inviteUrl is the full URL students paste in their browser:
 *   e.g. "http://localhost:5173/join?token=abc123&batchId=xyz"
 */
export const createInvite = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;
    const { type, expiresAt } = req.validated;

    const link = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId, trainerId: req.user.id } },
    });
    if (!link) throw new HttpError(403, 'You are not assigned to this batch');

    const invite = await prisma.batchInvite.create({
      data: {
        batchId,
        createdById: req.user.id,
        type,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/join?token=${invite.token}&batchId=${batchId}`;

    res.status(201).json({ invite, inviteUrl });
  } catch (err) {
    next(err);
  }
};

// POST /batches/:id/join

/**
 * Student uses an invite token to join a batch.
 *
 * Request body: { token: string }
 * Response 200: { message: string }
 * Errors:
 *   404 — token not found or not active
 *   400 — invite has expired
 *   409 — student already a member (returns 200 with message, not error)
 */
export const joinBatch = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;
    const { token } = req.validated;
    const studentId = req.user.id;

    // Already joined — idempotent, not an error
    const existing = await prisma.batchStudent.findUnique({
      where: { batchId_studentId: { batchId, studentId } },
    });
    if (existing) return res.json({ message: 'You are already a member of this batch' });

    // Find active invite
    const invite = await prisma.batchInvite.findFirst({
      where: { token, batchId, isActive: true },
    });
    if (!invite) throw new HttpError(404, 'Invite not found or no longer active');

    // Check expiry
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new HttpError(400, 'This invite link has expired');
    }

    const now = new Date();

    // Join batch + handle invite lifecycle atomically
    await prisma.$transaction(async (tx) => {
      await tx.batchStudent.create({ data: { batchId, studentId } });

      // If student joins after sessions have already ended, backfill ABSENT entries.
      const sessions = await tx.session.findMany({
        where: { batchId },
        select: { id: true, date: true, endTime: true },
      });

      const missed = sessions
        .filter((s) => isSessionEnded(s, now))
        .map((s) => ({ sessionId: s.id, studentId, status: 'ABSENT' }));

      if (missed.length > 0) {
        await tx.attendance.createMany({
          data: missed,
          skipDuplicates: true,
        });
      }

      const update = { useCount: { increment: 1 } };
      if (invite.type === 'ONE_TIME') update.isActive = false;

      await tx.batchInvite.update({ where: { id: invite.id }, data: update });
    });

    res.json({ message: 'Successfully joined the batch' });
  } catch (err) {
    next(err);
  }
};

// GET /batches/:id/summary

/**
 * Returns attendance stats for every session in a batch.
 * Only the institution that owns the batch can view this.
 *
 * Response:
 * {
 *   batch: { id, name },
 *   totalSessions: number,
 *   totalStudents: number,
 *   sessions: [{ id, title, date, present, late, absent, total }]
 * }
 */
export const getBatchSummary = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;

    const tracker = await prisma.session.findMany({
      where: { batchId },
      select: { id: true, batchId: true, date: true, endTime: true },
    });

    await Promise.all(tracker.map((s) => syncSessionAbsencesIfEnded(prisma, s)));

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        students: true,
        sessions: {
          include: { attendance: { select: { status: true } } },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!batch) throw new HttpError(404, 'Batch not found');
    if (batch.institutionId !== req.user.institutionId) {
      throw new HttpError(403, 'This batch does not belong to your institution');
    }

    const sessions = batch.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      date: session.date,
      present: session.attendance.filter((a) => a.status === 'PRESENT').length,
      late: session.attendance.filter((a) => a.status === 'LATE').length,
      absent: session.attendance.filter((a) => a.status === 'ABSENT').length,
      total: session.attendance.length,
    }));

    res.json({
      batch: { id: batch.id, name: batch.name },
      totalSessions: batch.sessions.length,
      totalStudents: batch.students.length,
      sessions,
    });
  } catch (err) {
    next(err);
  }
};

// GET /institution/trainers

/**
 * Returns all users with role=TRAINER who belong to this institution.
 * Used by the Institution dashboard to populate the "Assign Trainer" dropdown.
 *
 * Response: { trainers: [{ id, name }] }
 */
export const getInstitutionTrainers = async (req, res, next) => {
  try {
    const { institutionId } = req.user;
    if (!institutionId) throw new HttpError(400, 'You are not linked to an institution');

    const trainers = await prisma.user.findMany({
      where: { institutionId, role: 'TRAINER' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json({ trainers });
  } catch (err) {
    next(err);
  }
};
