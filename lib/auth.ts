import { cookies } from "next/headers";

export async function requireUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value ?? null;
}