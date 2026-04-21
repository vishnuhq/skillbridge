/**
 * Attendance Controller
 *
 * Handles:
 *   POST /attendance/mark — student marks own attendance
 */

import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * POST /attendance/mark
 * Student marks their attendance for a session.
 * Body: { sessionId, status? }
 *
 * Validation checks:
 *   1. Session must exist
 *   2. Student must be enrolled in the session's batch
 *   3. Student cannot mark attendance twice for the same session
 */
export const markAttendance = async (req, res, next) => {
  try {
    const { sessionId, status } = req.validated;
    const studentId = req.user.id;

    // Load session with batch info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, batchId: true, date: true },
    });

    if (!session) throw new HttpError(404, 'Session not found');

    // Confirm student is enrolled in this batch
    const enrollment = await prisma.batchStudent.findUnique({
      where: { batchId_studentId: { batchId: session.batchId, studentId } },
    });

    if (!enrollment) {
      throw new HttpError(403, "You are not enrolled in this session's batch");
    }

    // Check for duplicate attendance
    const alreadyMarked = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });

    if (alreadyMarked) {
      throw new HttpError(409, 'Attendance already marked for this session');
    }

    const attendance = await prisma.attendance.create({
      data: { sessionId, studentId, status },
    });

    res.status(201).json({ attendance });
  } catch (err) {
    next(err);
  }
};
