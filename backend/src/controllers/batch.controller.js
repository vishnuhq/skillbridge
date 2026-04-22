/**
 * Batch Controller
 *
 * Handles:
 *   POST /batches           — create batch (TRAINER or INSTITUTION)
 *   POST /batches/:id/invite — generate invite link (TRAINER)
 *   POST /batches/:id/join   — join batch via invite token (STUDENT)
 *   GET  /batches/:id/summary — batch attendance summary (INSTITUTION)
 */

import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * POST /batches
 * Trainer creates a batch within their own institution.
 * Institution role can also create batches.
 */
export const createBatch = async (req, res, next) => {
  try {
    const { name } = req.validated;
    const { institutionId, role } = req.user;

    if (!institutionId) {
      throw new HttpError(400, 'You must belong to an institution to create a batch');
    }

    const batch = await prisma.batch.create({
      data: { name, institutionId },
      include: { institution: { select: { id: true, name: true } } },
    });

    // Auto-assign the creating trainer to the batch
    if (role === 'TRAINER') {
      await prisma.batchTrainer.create({
        data: { batchId: batch.id, trainerId: req.user.id },
      });
    }

    res.status(201).json({ batch });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /batches/:id/invite
 * Trainer generates a ONE_TIME or REUSABLE invite link for their batch.
 */
export const createInvite = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;
    const { type, expiresAt } = req.validated;

    // Verify trainer is assigned to this batch
    const link = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId, trainerId: req.user.id } },
    });

    if (!link) {
      throw new HttpError(403, 'You are not assigned to this batch');
    }

    const invite = await prisma.batchInvite.create({
      data: {
        batchId,
        createdById: req.user.id,
        type,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Build the full invite URL (frontend will handle this route)
    const inviteUrl = `${process.env.FRONTEND_URL}/join?token=${invite.token}&batchId=${batchId}`;

    res.status(201).json({ invite, inviteUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /batches/:id/join
 * Student uses an invite token to join a batch.
 * Body: { token }
 */
export const joinBatch = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;
    const { token } = req.validated;
    const studentId = req.user.id;

    // Already in this batch?
    const existing = await prisma.batchStudent.findUnique({
      where: { batchId_studentId: { batchId, studentId } },
    });

    if (existing) {
      return res.json({ message: 'Already a member of this batch' });
    }

    // Validate the invite token
    const invite = await prisma.batchInvite.findFirst({
      where: {
        token,
        batchId,
        isActive: true,
      },
    });

    if (!invite) throw new HttpError(404, 'Invalid or expired invite token');

    // Check expiry
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new HttpError(400, 'This invite has expired');
    }

    // Add student + handle ONE_TIME deactivation in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.batchStudent.create({ data: { batchId, studentId } });

      if (invite.type === 'ONE_TIME') {
        await tx.batchInvite.update({
          where: { id: invite.id },
          data: { isActive: false, useCount: { increment: 1 } },
        });
      } else {
        await tx.batchInvite.update({
          where: { id: invite.id },
          data: { useCount: { increment: 1 } },
        });
      }
    });

    res.json({ message: 'Successfully joined batch' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /batches/:id/summary
 * Returns attendance stats for all sessions in a batch.
 * Access: INSTITUTION (must own the batch)
 */
export const getBatchSummary = async (req, res, next) => {
  try {
    const { id: batchId } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        students: {
          include: { student: { select: { id: true, name: true } } },
        },
        sessions: {
          include: {
            attendance: true,
          },
        },
      },
    });

    if (!batch) throw new HttpError(404, 'Batch not found');

    // Verify this institution owns the batch
    if (batch.institutionId !== req.user.institutionId) {
      throw new HttpError(403, 'Access denied');
    }

    const totalSessions = batch.sessions.length;
    const totalStudents = batch.students.length;

    // Build per-session attendance breakdown
    const sessions = batch.sessions.map((session) => {
      const present = session.attendance.filter((a) => a.status === 'PRESENT').length;
      const late = session.attendance.filter((a) => a.status === 'LATE').length;
      const absent = session.attendance.filter((a) => a.status === 'ABSENT').length;
      return {
        id: session.id,
        title: session.title,
        date: session.date,
        present,
        late,
        absent,
        total: session.attendance.length,
      };
    });

    res.json({
      batch: { id: batch.id, name: batch.name },
      totalSessions,
      totalStudents,
      sessions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /batches
 * - INSTITUTION: returns all batches belonging to their institution
 * - TRAINER: returns only batches they are explicitly assigned to
 */
export const getBatches = async (req, res, next) => {
  try {
    const { role, id: userId, institutionId } = req.user;

    if (role === 'INSTITUTION') {
      if (!institutionId) throw new HttpError(400, 'No institution assigned');

      const batches = await prisma.batch.findMany({
        where: { institutionId },
        include: {
          trainers: { include: { trainer: { select: { id: true, name: true } } } },
          _count: { select: { students: true, sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ batches });
    }

    if (role === 'TRAINER') {
      // Only return batches this trainer is assigned to
      const trainerBatches = await prisma.batchTrainer.findMany({
        where: { trainerId: userId },
        include: {
          batch: {
            include: {
              _count: { select: { students: true, sessions: true } },
            },
          },
        },
      });

      const batches = trainerBatches.map((bt) => bt.batch);
      return res.json({ batches });
    }

    throw new HttpError(403, 'Forbidden');
  } catch (err) {
    next(err);
  }
};
