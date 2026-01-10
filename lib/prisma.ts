import "server-only";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";
import { parseDatabaseUrl } from "@/lib/redact";
import { applyRuntimeEnv } from "@/lib/runtimeEnv"; // jei naudoji tą "įkepimo" sprendimą

applyRuntimeEnv?.();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ✅ optional: pratestinam ryšį ir jei nepavyksta – užlogginam config
export async function prismaHealthcheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    logger.error("Prisma DB connect failed", {
      meta: {
        db: parseDatabaseUrl(process.env.DATABASE_URL),
        nodeEnv: process.env.NODE_ENV,
      },
    });
    throw e;
  }
}