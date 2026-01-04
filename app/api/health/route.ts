export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasSmtp: !!process.env.SMTP_HOST,
  });
}
