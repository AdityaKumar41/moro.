import Dashboard from "@/components/dashboard";
import { configured, sessionDb } from "@/lib/db";
import { redirect } from "next/navigation";
export const metadata = { title: "Your projects" };
export default async function Account() {
  if (!configured()) redirect("/auth?next=/account&error=unavailable");
  const db = await sessionDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth?next=/account");
  return <Dashboard />;
}
