export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { sendPasswordResetCode } from "@/lib/mailer"; 
import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!email || !isEmail(email)) {
      // Nedetalizuojam, bet galim grąžinti 400
      return NextResponse.json({ error: "Įvesk teisingą el. paštą" }, { status: 400 });
    }

    // Saugumo pasirinkimas:
    // 1) jei user neegzistuoja, vis tiek grąžinam success (kad neatskleistume)
    // 2) bet realiai nieko nesiunčiam
    const user = await prisma.user.findUnique({ where: { email } });

    // Resend rate limit (tik jei jau yra reset įrašas)
    const existing = await prisma.passwordReset.findUnique({ where: { email } });
    if (existing) {
      const seconds = (Date.now() - existing.lastSentAt.getTime()) / 1000;
      if (seconds < 30) {
        return NextResponse.json({ error: "Palauk ~30s ir bandyk vėl" }, { status: 429 });
      }
    }

if (!user) {
  return NextResponse.json(
    { error: "Tokiu el. paštu vartotojo nėra" },
    { status: 404 }
  );
}

    const code = genCode();
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordReset.upsert({
      where: { email },
      create: { email, codeHash, expiresAt },
      update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    });

    await sendPasswordResetCode(email, code);

    return NextResponse.json({ success: true });
} catch (err) {
  const id = crypto.randomUUID();
  console.error(`[FORGOT][${id}]`, err);
  return NextResponse.json({ error: `Serverio klaida (${id})` }, { status: 500 });
}
}
