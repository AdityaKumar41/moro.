import { sendNotifications } from "@/lib/worker";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import {
  actor,
  checked,
  fail,
  HttpError,
  jsonBody,
  sameOrigin,
  limit,
} from "@/lib/http";
import { adminDb } from "@/lib/db";
export async function GET() {
  try {
    const user = await actor(true);
    const db = adminDb();
    const [profiles, jobs, templates, health] = await Promise.all([
      db
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false }),
      db.rpc("operations_health", { p_actor: user.id }),
    ]);
    return NextResponse.json({
      profiles: checked(profiles).data,
      jobs: checked(jobs).data,
      templates: checked(templates).data,
      health: checked(health).data,
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor(true);
    const b = await jsonBody(req);
    if (b.action === "retry-email") {
      const { id } = z.object({ id: z.uuid() }).parse(b);
      await limit("retry-email:" + u.id, 10);
      checked(
        await adminDb().rpc("retry_notification", {
          p_actor: u.id,
          p_notification: id,
        }),
      );
      after(async () => {
        await sendNotifications(id);
      });
    } else if (b.action === "role") {
      const v = z
        .object({ id: z.uuid(), role: z.enum(["customer", "admin"]) })
        .parse(b);
      checked(
        await adminDb().rpc("set_user_role", {
          p_actor: u.id,
          p_user: v.id,
          p_role: v.role,
        }),
      );
    } else if (b.action === "retry") {
      const { id } = z.object({ id: z.uuid() }).parse(b);
      const db = adminDb();
      const { data: j } = checked(
        await db
          .from("jobs")
          .select("proof_id,order_id,kind,state")
          .eq("id", id)
          .single(),
      );
      if (!j || j.state !== "failed")
        throw new HttpError(409, "Only failed jobs can be retried");
      checked(
        await db
          .from("jobs")
          .update({ state: "queued", attempts: 0, last_error: null })
          .eq("id", id)
          .eq("state", "failed"),
      );
    } else throw new HttpError(400, "Unsupported admin action");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
