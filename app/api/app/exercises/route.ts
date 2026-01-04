export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function requireUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Visi pratimai, kuriuos useris mato: PUBLIC + jo PRIVATE
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [{ visibility: "PUBLIC" }, { visibility: "PRIVATE", ownerId: userId }],
    },
    select: {
      id: true,
      name: true,
      equipment: true,
      muscle: true,
      notes: true,
      imageUrl: true,
      visibility: true,
      ownerId: true,
    },
    orderBy: { name: "asc" },
  });

  // Paskutiniai daryti pratimai: pagal userio logus
  const lastLogs = await prisma.exerciseLog.findMany({
    where: { userId },
    select: { exerciseId: true, dateTime: true },
    orderBy: { dateTime: "desc" },
    take: 200, // pakanka, kad surinktume unikalius
  });

  const seen = new Set<string>();
  const recentIds: string[] = [];
  for (const l of lastLogs) {
    if (!seen.has(l.exerciseId)) {
      seen.add(l.exerciseId);
      recentIds.push(l.exerciseId);
    }
    if (recentIds.length >= 10) break;
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  const recent = recentIds.map((id) => byId.get(id)).filter(Boolean);
  const others = exercises.filter((e) => !seen.has(e.id));

  return NextResponse.json({ recent, others });
}


export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const equipment = String(body?.equipment ?? "");
  const muscle = String(body?.muscle ?? "");
  const notes = String(body?.notes ?? "").trim();
  const imageUrl = String(body?.imageUrl ?? "").trim();

  if (!name) return NextResponse.json({ error: "Įvesk pratimo pavadinimą" }, { status: 400 });

  // minimalus allowlist (kad neįmestų bet ko)
  const equipmentAllowed = ["machine", "cable", "dumbbell", "barbell", "bodyweight", "other"];
  const muscleAllowed = ["chest", "back", "legs", "shoulders", "arms", "core", "fullbody", "other"];
  if (!equipmentAllowed.includes(equipment)) return NextResponse.json({ error: "Neteisinga įranga" }, { status: 400 });
  if (!muscleAllowed.includes(muscle)) return NextResponse.json({ error: "Neteisinga raumenų grupė" }, { status: 400 });

  const created = await prisma.exercise.create({
    data: {
      name,
      equipment: equipment as any,
      muscle: muscle as any,
      notes: notes ? notes : null,
      imageUrl: imageUrl ? imageUrl : null,
      visibility: "PRIVATE",
      ownerId: userId,
    },
    select: {
      id: true,
      name: true,
      equipment: true,
      muscle: true,
      notes: true,
      imageUrl: true,
      visibility: true,
      ownerId: true,
    },
  });

  return NextResponse.json({ success: true, exercise: created });
}
