/**
 * Validators
 */

import { z } from 'zod';

// Auth

export const ROLES = [
  'STUDENT',
  'TRAINER',
  'INSTITUTION',
  'PROGRAMME_MANAGER',
  'MONITORING_OFFICER',
];

/**
 * POST /auth/sync — creates the DB user record after Clerk sign-up
 */
export const syncSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum(ROLES),
    // For STUDENT / TRAINER: must pick an existing institution
    institutionId: z.string().min(1).optional().nullable(),
    // For INSTITUTION role: can create a new institution by name
    institutionName: z.string().min(2).max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'INSTITUTION' && !data.institutionId && !data.institutionName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'institutionName is required when creating a new institution',
        path: ['institutionName'],
      });
    }
    if ((data.role === 'STUDENT' || data.role === 'TRAINER') && !data.institutionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'institutionId is required for this role',
        path: ['institutionId'],
      });
    }
  });

// Batch

export const createBatchSchema = z.object({
  name: z.string().min(2, 'Batch name required').max(120),
  // Optional: INSTITUTION role can pass institutionId explicitly,
  // otherwise the backend uses req.user.institutionId
  institutionId: z.string().optional(),
});

export const createInviteSchema = z.object({
  type: z.enum(['ONE_TIME', 'REUSABLE']).default('ONE_TIME'),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const joinBatchSchema = z.object({
  token: z.string().min(1, 'Invite token required'),
});

// Session

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createSessionSchema = z
  .object({
    batchId: z.string().min(1, 'Batch ID required'),
    title: z.string().min(3, 'Title too short').max(120),
    date: z.string().regex(DATE_REGEX, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(TIME_REGEX, 'Start time must be HH:MM'),
    endTime: z.string().regex(TIME_REGEX, 'End time must be HH:MM'),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

// Attendance

export const markAttendanceSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']).default('PRESENT'),
});
