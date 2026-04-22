/**
 * Attendance lifecycle helpers
 *
 * Centralizes session time calculations and automatic ABSENT backfilling.
 */

/**
 * Builds a Date from "YYYY-MM-DD" and "HH:MM" in server local timezone.
 * Returns null if invalid.
 */
export const buildSessionDateTime = (date, time) => {
  const dt = new Date(`${date}T${time}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/**
 * True when current time is past or equal to the session end time.
 */
export const isSessionEnded = (session, now = new Date()) => {
  const endAt = buildSessionDateTime(session.date, session.endTime);
  if (!endAt) return false;
  return now >= endAt;
};

/**
 * True when current time is more than `graceMinutes` after session start.
 */
export const isAfterLateThreshold = (session, now = new Date(), graceMinutes = 15) => {
  const startAt = buildSessionDateTime(session.date, session.startTime);
  if (!startAt) return false;
  const lateCutoff = new Date(startAt.getTime() + graceMinutes * 60 * 1000);
  return now > lateCutoff;
};

/**
 * For ended sessions, ensure every enrolled student has an attendance row.
 * Missing rows are created as ABSENT.
 */
export const syncSessionAbsencesIfEnded = async (prismaClient, session, now = new Date()) => {
  if (!isSessionEnded(session, now)) return;

  const [enrolled, existing] = await Promise.all([
    prismaClient.batchStudent.findMany({
      where: { batchId: session.batchId },
      select: { studentId: true },
    }),
    prismaClient.attendance.findMany({
      where: { sessionId: session.id },
      select: { studentId: true },
    }),
  ]);

  if (enrolled.length === 0) return;

  const existingIds = new Set(existing.map((a) => a.studentId));
  const rows = enrolled
    .map((e) => e.studentId)
    .filter((studentId) => !existingIds.has(studentId))
    .map((studentId) => ({
      sessionId: session.id,
      studentId,
      status: 'ABSENT',
    }));

  if (rows.length === 0) return;

  await prismaClient.attendance.createMany({
    data: rows,
    skipDuplicates: true,
  });
};
