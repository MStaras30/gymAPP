import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function Page() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");
  return <HomeClient />;
}