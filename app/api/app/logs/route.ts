export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function requireUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value ?? null;
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const exerciseId = String(body?.exerciseId ?? "");
  const weightKg = Number(body?.weightKg);
  const reps = Number(body?.reps);
  const comment = String(body?.comment ?? "").trim();

  if (!exerciseId) return NextResponse.json({ error: "Trūksta exerciseId" }, { status: 400 });
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    return NextResponse.json({ error: "Blogas svoris" }, { status: 400 });
  }
  if (!Number.isInteger(reps) || reps <= 0) {
    return NextResponse.json({ error: "Blogi pakartojimai" }, { status: 400 });
  }

  // Patikrinam, ar useris turi teisę matyti/naudoti pratimą
  const ex = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ visibility: "PUBLIC" }, { visibility: "PRIVATE", ownerId: userId }],
    },
    select: { id: true },
  });

  if (!ex) return NextResponse.json({ error: "Pratimas nerastas arba neprieinamas" }, { status: 404 });

  const created = await prisma.exerciseLog.create({
    data: {
      userId,
      exerciseId,
      weightKg, // Prisma Decimal priims number; jei norėsi 100% tikslumo - galim siųsti string
      reps,
      comment: comment ? comment : null,
    },
    select: {
      id: true,
      exerciseId: true,
      dateTime: true,
      weightKg: true,
      reps: true,
      comment: true,
    },
  });

  return NextResponse.json({ success: true, log: created });
}

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId") ?? "";

  if (!exerciseId) return NextResponse.json({ error: "Trūksta exerciseId" }, { status: 400 });

  // patikrinam, ar useris turi teisę matyti pratimą
  const ex = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [{ visibility: "PUBLIC" }, { visibility: "PRIVATE", ownerId: userId }],
    },
    select: { id: true },
  });
  if (!ex) return NextResponse.json({ error: "Pratimas nerastas arba neprieinamas" }, { status: 404 });

  const logs = await prisma.exerciseLog.findMany({
    where: { userId, exerciseId },
    orderBy: { dateTime: "desc" },
    take: 300,
    select: {
      id: true,
      exerciseId: true,
      dateTime: true,
      weightKg: true,
      reps: true,
      comment: true,
    },
  });

  return NextResponse.json({ logs });
}
