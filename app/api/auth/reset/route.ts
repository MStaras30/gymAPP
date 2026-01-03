export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim().toUpperCase();
    const newPassword = String(body?.newPassword ?? "");

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Trūksta duomenų" }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: "Kodas turi būti 6 simboliai" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Slaptažodis per trumpas (min 8)" }, { status: 400 });
    }

    const pending = await prisma.passwordReset.findUnique({ where: { email } });
    if (!pending) {
      return NextResponse.json({ error: "Kodas nebegalioja. Paprašyk naujo." }, { status: 400 });
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await prisma.passwordReset.delete({ where: { email } });
      return NextResponse.json({ error: "Kodas nebegalioja. Paprašyk naujo." }, { status: 400 });
    }

    if (pending.attempts >= 5) {
      return NextResponse.json({ error: "Per daug bandymų. Paprašyk naujo kodo." }, { status: 429 });
    }

    const ok = sha256(code) === pending.codeHash;

    await prisma.passwordReset.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) {
      return NextResponse.json({ error: "Neteisingas kodas" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // atnaujinam password ir gaunam user id loginui
    const user = await prisma.user.update({
      where: { email },
      data: { password: passwordHash },
      select: { id: true },
    });

    await prisma.passwordReset.delete({ where: { email } });

    // ✅ AUTOMATINIS LOGIN PO RESET
    const res = NextResponse.json({ success: true });
    res.cookies.set("session", user.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Serverio klaida" }, { status: 500 });
  }
}
