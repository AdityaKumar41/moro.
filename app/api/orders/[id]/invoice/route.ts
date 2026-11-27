import { z } from "zod";
import { after, NextResponse } from "next/server";
import { sendNotifications } from "@/lib/worker";
import { buildReceipt } from "@/lib/receipt";
import {
  actor,
  checked,
  fail,
  HttpError,
  sameOrigin,
  jsonBody,
  limit,
} from "@/lib/http";
import { adminDb } from "@/lib/db";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await actor();
    const { id } = await params;
    const { data: o } = checked(
      await adminDb()
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("customer_id", u.id)
        .single(),
    );
    if (o.payment_status !== "paid")
      throw new HttpError(409, "Receipt available after payment");
    const { data: payment } = checked(
      await adminDb()
        .from("payment_events")
        .select("created_at")
        .eq("order_id", id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    );
    const receipt = await buildReceipt(o, payment?.created_at);
    return new Response(receipt, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DH-${o.number}-receipt.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}

// An explicit customer request uses a stable id so network retries cannot enqueue
// a second copy. The worker retries delivery independently of the page lifecycle.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await actor();
    const { id } = await params;
    const { requestId } = z
      .object({ requestId: z.uuid() })
      .parse(await jsonBody(req, 2048));
    const db = adminDb();
    const { data: order } = checked(
      await db
        .from("orders")
        .select("id,payment_status")
        .eq("id", id)
        .eq("customer_id", user.id)
        .single(),
    );
    if (!order) throw new HttpError(404, "Order not found");
    if (order.payment_status !== "paid")
      throw new HttpError(409, "Receipt available after payment");
    const { data: previous } = checked(
      await db
        .from("notifications")
        .select("customer_id,order_id,kind,state")
        .eq("id", requestId)
        .maybeSingle(),
    );
    if (previous) {
      if (
        previous.customer_id !== user.id ||
        previous.order_id !== id ||
        previous.kind !== "receipt_requested"
      )
        throw new HttpError(409, "Please request a new receipt");
      if (["failed", "cancelled"].includes(previous.state))
        throw new HttpError(
          409,
          "Email could not be sent. Request a new receipt.",
        );
      return NextResponse.json({ state: previous.state }, { status: 202 });
    }
    await limit("receipt:" + user.id + ":" + id, 3);
    checked(
      await db.from("notifications").upsert(
        {
          id: requestId,
          customer_id: user.id,
          order_id: id,
          kind: "receipt_requested",
        },
        { onConflict: "id", ignoreDuplicates: true },
      ),
    );
    after(async () => {
      await sendNotifications(requestId);
    });
    return NextResponse.json({ state: "queued" }, { status: 202 });
  } catch (error) {
    return fail(error);
  }
}
