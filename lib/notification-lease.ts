import { adminDb } from "./db";
import { checked } from "./http";
export type NotificationRow = {
  id: string;
  customer_id: string;
  order_id: string;
  kind: string;
  state: string;
  attempts: number;
  locked_until: string | null;
};
/** Claim one explicitly requested message without draining other customers' mail.
 * Compare-and-swap on attempt/state/lease shares ownership with the cron RPC. */
export async function claimNotification(
  id: string,
): Promise<NotificationRow[]> {
  const db = adminDb();
  const { data: row } = checked(
    await db.from("notifications").select("*").eq("id", id).maybeSingle(),
  );
  if (
    !row ||
    row.attempts >= 4 ||
    !(
      row.state === "queued" ||
      (row.state === "sending" &&
        row.locked_until &&
        Date.parse(row.locked_until) < Date.now())
    )
  )
    return [];
  let query = db
    .from("notifications")
    .update({
      state: "sending",
      attempts: row.attempts + 1,
      locked_until: new Date(Date.now() + 120000).toISOString(),
    })
    .eq("id", id)
    .eq("state", row.state)
    .eq("attempts", row.attempts);
  if (row.state === "sending")
    query = query.eq("locked_until", row.locked_until);
  return checked(await query.select("*")).data || [];
}
