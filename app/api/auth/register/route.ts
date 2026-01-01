import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Trūksta duomenų" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({
    where: { email },
  })

  if (exists) {
    return NextResponse.json({ error: "Vartotojas jau egzistuoja" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      email,
      password: hashed,
    },
  })

  return NextResponse.json({ success: true })
}