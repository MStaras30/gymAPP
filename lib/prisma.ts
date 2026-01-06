import "server-only";
import { PrismaClient } from "@prisma/client";
import { applyRuntimeEnv } from "@/lib/runtimeEnv";

applyRuntimeEnv(); // <- labai svarbu prieš PrismaClient

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
