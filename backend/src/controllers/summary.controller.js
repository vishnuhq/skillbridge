/**
 * Summary Controller
 *
 * Handles:
 *   GET /institutions/:id/summary — Programme Manager: all batches in an institution
 *   GET /programme/summary        — Programme Manager + Monitoring Officer: programme-wide
 */

import { syncSessionAbsencesIfEnded } from '../lib/attendanceLifecycle.js';
import { HttpError } from '../lib/httpError.js';
import { prisma } from '../lib/prisma.js';

/**
 * GET /institutions/:id/summary
 * Returns batch-level attendance summary for one institution.
 * Access: PROGRAMME_MANAGER
 */
export const getInstitutionSummary = async (req, res, next) => {
  try {
    const { id: institutionId } = req.params;

    const tracker = await prisma.session.findMany({
      where: { batch: { institutionId } },
      select: { id: true, batchId: true, date: true, endTime: true },
    });

    await Promise.all(tracker.map((s) => syncSessionAbsencesIfEnded(prisma, s)));

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        batches: {
          include: {
            _count: { select: { students: true, sessions: true } },
            sessions: {
              include: {
                _count: { select: { attendance: true } },
                attendance: { select: { status: true } },
              },
            },
          },
        },
      },
    });

    if (!institution) throw new HttpError(404, 'Institution not found');

    const batches = institution.batches.map((batch) => {
      const totalAttendance = batch.sessions.flatMap((s) => s.attendance);
      const present = totalAttendance.filter((a) => a.status === 'PRESENT').length;
      const rate =
        totalAttendance.length > 0 ? Math.round((present / totalAttendance.length) * 100) : null;

      return {
        id: batch.id,
        name: batch.name,
        totalStudents: batch._count.students,
        totalSessions: batch._count.sessions,
        attendanceRate: rate,
      };
    });

    res.json({ institution: { id: institution.id, name: institution.name }, batches });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /programme/summary
 * Returns programme-wide stats across all institutions.
 * Access: PROGRAMME_MANAGER or MONITORING_OFFICER (read-only)
 */
export const getProgrammeSummary = async (req, res, next) => {
  try {
    const tracker = await prisma.session.findMany({
      select: { id: true, batchId: true, date: true, endTime: true },
    });

    await Promise.all(tracker.map((s) => syncSessionAbsencesIfEnded(prisma, s)));

    const institutions = await prisma.institution.findMany({
      include: {
        _count: { select: { batches: true, users: true } },
        batches: {
          include: {
            sessions: {
              include: { attendance: { select: { status: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const summary = institutions.map((inst) => {
      const allAttendance = inst.batches.flatMap((b) => b.sessions.flatMap((s) => s.attendance));
      const present = allAttendance.filter((a) => a.status === 'PRESENT').length;
      const totalSessions = inst.batches.reduce((sum, b) => sum + b.sessions.length, 0);
      const rate =
        allAttendance.length > 0 ? Math.round((present / allAttendance.length) * 100) : null;

      return {
        id: inst.id,
        name: inst.name,
        totalBatches: inst._count.batches,
        totalSessions,
        attendanceRate: rate,
        totalRecords: allAttendance.length,
      };
    });

    const totals = {
      institutions: summary.length,
      batches: summary.reduce((s, i) => s + i.totalBatches, 0),
      sessions: summary.reduce((s, i) => s + i.totalSessions, 0),
    };

    res.json({ summary, totals });
  } catch (err) {
    next(err);
  }
};
