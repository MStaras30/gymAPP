export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim().toUpperCase();

    if (!email || !code) return NextResponse.json({ error: "Trūksta duomenų" }, { status: 400 });
    if (code.length !== 6) return NextResponse.json({ error: "Kodas turi būti 6 simboliai" }, { status: 400 });

    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (!pending) return NextResponse.json({ error: "Registracija nepradėta arba kodas nebegalioja" }, { status: 400 });

    if (pending.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerification.delete({ where: { email } });
      return NextResponse.json({ error: "Kodas nebegalioja. Registruokis iš naujo." }, { status: 400 });
    }

    if (pending.attempts >= 5) {
      return NextResponse.json({ error: "Per daug bandymų. Bandyk vėliau." }, { status: 429 });
    }

    const ok = sha256(code) === pending.codeHash;

    await prisma.emailVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) return NextResponse.json({ error: "Neteisingas kodas" }, { status: 401 });

    // sukuriam user
    const user = await prisma.user.create({
      data: { email, password: pending.passwordHash },
      select: { id: true },
    });

    // išvalom pending
    await prisma.emailVerification.delete({ where: { email } });

    const res = NextResponse.json({ success: true });
    res.cookies.set("session", user.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
} catch (err) {
  const id = crypto.randomUUID();
  console.error(`[VERIFY][${id}]`, err);
  return NextResponse.json({ error: `Serverio klaida (${id})` }, { status: 500 });
}
}
