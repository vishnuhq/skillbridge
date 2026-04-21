/**
 * Session Controller
 *
 * Handles:
 *   POST /sessions          — create session (TRAINER)
 *   GET  /sessions          — list sessions for trainer or student
 *   GET  /sessions/:id/attendance — session attendance (TRAINER)
 */

import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * POST /sessions
 * Creates a session for a batch the trainer is assigned to.
 */
export const createSession = async (req, res, next) => {
  try {
    const { batchId, title, date, startTime, endTime } = req.validated;
    const trainerId = req.user.id;

    // Verify trainer is assigned to this batch
    const link = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId, trainerId } },
    });

    if (!link) throw new HttpError(403, 'You are not assigned to this batch');

    const session = await prisma.session.create({
      data: { batchId, trainerId, title, date, startTime, endTime },
      include: {
        batch: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /sessions
 * For TRAINER: returns sessions they created.
 * For STUDENT: returns sessions for batches they're enrolled in.
 */
export const getSessions = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    if (role === 'TRAINER') {
      const sessions = await prisma.session.findMany({
        where: { trainerId: userId },
        include: {
          batch: { select: { id: true, name: true } },
          _count: { select: { attendance: true } },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      });

      return res.json({ sessions });
    }

    if (role === 'STUDENT') {
      // Find all batches this student is enrolled in
      const enrolledBatches = await prisma.batchStudent.findMany({
        where: { studentId: userId },
        select: { batchId: true },
      });

      const batchIds = enrolledBatches.map((b) => b.batchId);

      // Get sessions for those batches
      const sessions = await prisma.session.findMany({
        where: { batchId: { in: batchIds } },
        include: {
          batch: { select: { id: true, name: true } },
          // Check if THIS student has already marked attendance
          attendance: {
            where: { studentId: userId },
            select: { status: true, markedAt: true },
          },
        },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      });

      return res.json({ sessions });
    }

    throw new HttpError(403, 'Forbidden');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /sessions/:id/attendance
 * Returns full attendance list for a session.
 * Access: TRAINER (must own the session)
 */
export const getSessionAttendance = async (req, res, next) => {
  try {
    const { id: sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        attendance: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
        batch: { select: { id: true, name: true } },
      },
    });

    if (!session) throw new HttpError(404, 'Session not found');
    if (session.trainerId !== req.user.id) throw new HttpError(403, 'Access denied');

    const stats = {
      present: session.attendance.filter((a) => a.status === 'PRESENT').length,
      late: session.attendance.filter((a) => a.status === 'LATE').length,
      absent: session.attendance.filter((a) => a.status === 'ABSENT').length,
    };

    res.json({ session, stats });
  } catch (err) {
    next(err);
  }
};
