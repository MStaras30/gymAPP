export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/mailer";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function genCode() {
  // 6 simboliai: raidės + skaičiai (be dviprasmiškų)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) return NextResponse.json({ error: "Trūksta duomenų" }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Neteisingas el. paštas" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Slaptažodis per trumpas (min 8)" }, { status: 400 });

    // jei jau yra user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Toks el. paštas jau užregistruotas" }, { status: 409 });

    // rate limit resend: pvz. 30s
    const pending = await prisma.emailVerification.findUnique({ where: { email } });
    if (pending) {
      const seconds = (Date.now() - pending.lastSentAt.getTime()) / 1000;
      if (seconds < 30) {
        return NextResponse.json({ error: "Palauk ~30s ir bandyk vėl" }, { status: 429 });
      }
    }

    const code = genCode();
    const codeHash = sha256(code);
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.emailVerification.upsert({
      where: { email },
      create: { email, passwordHash, codeHash, expiresAt },
      update: { passwordHash, codeHash, expiresAt, lastSentAt: new Date(), attempts: 0 },
    });

    await sendVerificationCode(email, code);

    return NextResponse.json({ success: true });
} catch (err) {
  const id = crypto.randomUUID();
  console.error(`[AUTH_REGISTER][${id}]`, err);
  return NextResponse.json({ error: `Serverio klaida (${id})` }, { status: 500 });
}
}
