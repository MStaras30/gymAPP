import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import HomeClient from "./HomeClient";

export default async function Page() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session")?.value ?? null;

  if (!userId) redirect("/login");

  return <HomeClient />;
}
