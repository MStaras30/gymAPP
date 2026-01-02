export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = String(body?.email ?? "").trim().toLowerCase();
    const passwordRaw = String(body?.password ?? "");

    if (!emailRaw || !passwordRaw) {
      return NextResponse.json({ error: "Trūksta duomenų" }, { status: 400 });
    }

    if (!isEmail(emailRaw)) {
      return NextResponse.json({ error: "Neteisingas el. paštas" }, { status: 400 });
    }

    if (passwordRaw.length < 8) {
      return NextResponse.json({ error: "Slaptažodis per trumpas (min 8 simboliai)" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (existing) {
      return NextResponse.json({ error: "Toks el. paštas jau užregistruotas" }, { status: 409 });
    }

    const hash = await bcrypt.hash(passwordRaw, 10);

    const user = await prisma.user.create({
      data: {
        email: emailRaw,
        password: hash,
      },
      select: { id: true },
    });

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
