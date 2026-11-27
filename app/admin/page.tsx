import Dashboard from "@/components/dashboard";
import { configured, sessionDb } from "@/lib/db";
import { redirect } from "next/navigation";
export const metadata = { title: "Production workspace" };
export default async function Admin() {
  if (!configured()) redirect("/auth?next=/admin&error=unavailable");
  const db = await sessionDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth?next=/admin");
  const { data: p } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin") redirect("/account");
  return <Dashboard admin />;
}
