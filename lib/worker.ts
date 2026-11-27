import { claimNotification, type NotificationRow } from "./notification-lease";
import { orderNotification } from "./order-notification";
import { printProfileSchema } from "./catalog";
import { mailConfigured, sendMail } from "./mail";
import { createHash } from "node:crypto";
import { adminDb } from "./db";
import { renderArtwork } from "./render";
import { checked } from "./http";
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export async function workOnce(batchSize = 25) {
  const db = adminDb();
  const { data: jobs } = checked(await db.rpc("claim_job"));
  const j = jobs?.[0];
  if (!j) return false;
  try {
    const { data: o } = checked(
      await db.from("orders").select("*").eq("id", j.order_id).single(),
    );
    const { data: p } = checked(
      await db.from("proofs").select("*").eq("id", j.proof_id).single(),
    );
    if (o.payment_status !== "paid") throw Error("Payment not captured");
    if (
      j.kind === "production" &&
      (o.approved_proof_id !== p.id || p.state !== "approved")
    )
      throw Error("Approved proof required");
    if (j.kind === "proof" && p.state !== "rendering")
      throw Error("Proof superseded");
    const rows = o.variable_data.length ? o.variable_data : [{}];
    let preview = j.preview_path || "";
    const start = j.completed_rows || 0;
    const end = Math.min(rows.length, start + batchSize);
    for (let index = start; index < end; index++) {
      const printProfile = printProfileSchema.parse(
        o.pricing.printProfile ?? {},
      );
      const { png, pdf } = await renderArtwork(
        p.artwork,
        o.configuration,
        rows[index],
        printProfile.dpi,
        printProfile.bleedMm,
      );
      const folder = `${o.id}/${o.configuration.productId}/${o.created_at.slice(0, 10)}/v${p.version}`;
      const stem = `DH-${o.number}_${o.configuration.productId}_${o.created_at.slice(0, 10)}_${String(index + 1).padStart(4, "0")}`;
      if (j.kind === "proof") {
        const path = `${folder}/${stem}.png`;
        const { error } = await db.storage
          .from("proofs")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (error) throw error;
        if (index === 0) preview = path;
      } else {
        for (const [kind, bytes] of [
          ["png", png],
          ["pdf", pdf],
        ] as const) {
          const path = `${folder}/${stem}.${kind}`;
          const { error } = await db.storage
            .from("production")
            .upload(path, bytes, {
              contentType: kind === "png" ? "image/png" : "application/pdf",
              upsert: true,
            });
          if (error) throw error;
          checked(
            await db.from("artifacts").upsert(
              {
                order_id: o.id,
                proof_id: p.id,
                path,
                kind,
                row_number: index + 1,
                sha256: hash(bytes),
              },
              { onConflict: "path" },
            ),
          );
        }
      }
    }
    if (end < rows.length) {
      checked(
        await db
          .from("jobs")
          .update({
            state: "queued",
            attempts: 0,
            completed_rows: end,
            preview_path: preview || null,
            locked_until: null,
          })
          .eq("id", j.id)
          .eq("lease_id", j.lease_id),
      );
      return true;
    }
    const { data: ok } = checked(
      await db.rpc("finish_job", {
        p_job: j.id,
        p_lease: j.lease_id,
        p_preview: preview || null,
      }),
    );
    if (!ok) throw Error("Render lease expired");
  } catch (e) {
    checked(
      await db
        .from("jobs")
        .update({
          state: j.attempts >= 4 ? "failed" : "queued",
          last_error: e instanceof Error ? e.message : "Render failed",
          locked_until: null,
        })
        .eq("id", j.id)
        .eq("lease_id", j.lease_id),
    );
  }
  return true;
}
export async function sendNotifications(notificationId?: string) {
  if (!mailConfigured() || !process.env.EMAIL_FROM) return 0;
  const db = adminDb();
  const rows: NotificationRow[] = notificationId
    ? await claimNotification(notificationId)
    : checked(await db.rpc("claim_notifications")).data || [];
  let sent = 0;
  for (const n of rows || []) {
    const {
      data: { user },
      error,
    } = await db.auth.admin.getUserById(n.customer_id);
    if (error || !user?.email) {
      checked(
        await db
          .from("notifications")
          .update({ state: "failed", locked_until: null })
          .eq("id", n.id),
      );
      continue;
    }
    try {
      const { data: order } = checked(
        await db.from("orders").select("*").eq("id", n.order_id).single(),
      );
      if (!order || order.customer_id !== n.customer_id)
        throw Error("Notification ownership mismatch");
      if (
        ["payment_received", "receipt_requested"].includes(n.kind) &&
        order.payment_status !== "paid"
      ) {
        checked(
          await db
            .from("notifications")
            .update({ state: "cancelled", locked_until: null })
            .eq("id", n.id),
        );
        continue;
      }
      const { data: payment } = checked(
        await db
          .from("payment_events")
          .select("created_at")
          .eq("order_id", n.order_id)
          .order("created_at")
          .limit(1)
          .maybeSingle(),
      );
      await sendMail({
        to: user.email,
        ...(await orderNotification(n.kind, order, payment?.created_at)),
        idempotencyKey: "notification/" + n.id,
      });
      checked(
        await db.from("notifications").update({ state: "sent" }).eq("id", n.id),
      );
      sent++;
    } catch {
      checked(
        await db
          .from("notifications")
          .update({
            state: n.attempts >= 4 ? "failed" : "queued",
            locked_until: null,
          })
          .eq("id", n.id),
      );
    }
  }
  return sent;
}

export async function drainQueue(budgetMs = 45000) {
  const deadline = Date.now() + budgetMs;
  let batches = 0;
  while (Date.now() < deadline && (await workOnce(5))) batches++;
  await sendNotifications();
  return batches;
}
