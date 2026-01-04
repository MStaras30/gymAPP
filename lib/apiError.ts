import "server-only";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

export function apiError(error: unknown, message = "Serverio klaida", status = 500) {
  const requestId = randomUUID();

  logger.error(message, {
    requestId,
    meta: {
      status,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    },
  });

  return NextResponse.json(
    { error: `${message} (${requestId})` },
    { status }
  );
}
