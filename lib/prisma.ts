// lib/prisma.ts
//
// Prisma Client singleton for this app's own database (Static /
// StaticMember / StaticReview) — see prisma/schema.prisma. Cached on
// globalThis in dev so Next.js's hot-reload doesn't spin up a new
// PrismaClient (and a new pg pool) on every module reload.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
