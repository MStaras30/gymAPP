export const dynamic = "force-dynamic"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"


export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json(
      { error: "Trūksta duomenų" },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return NextResponse.json(
      { error: "Neteisingi prisijungimo duomenys" },
      { status: 401 }
    )
  }

  const ok = await bcrypt.compare(password, user.password)

  if (!ok) {
    return NextResponse.json(
      { error: "Neteisingi prisijungimo duomenys" },
      { status: 401 }
    )
  }

  const res = NextResponse.json({ success: true })

  res.cookies.set("session", user.id, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

  return res
}
