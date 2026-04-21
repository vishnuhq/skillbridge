/**
 * Prisma Client Singleton
 */

import { PrismaClient } from '@prisma/client';

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// @ts-ignore — globalThis has no `prisma` property by default
export const prisma = globalThis.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  globalThis.prisma = prisma;
}
