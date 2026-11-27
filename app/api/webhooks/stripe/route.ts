import { after, NextResponse } from "next/server";
import Stripe from "stripe";
import { assertOrderPaymentMode, paymentMode } from "@/lib/payment-mode";
import { stripeClient } from "@/lib/stripe";
import { capturedState } from "@/lib/stripe-payment";
import { adminDb } from "@/lib/db";
import { checked, fail, HttpError } from "@/lib/http";
import { drainQueue } from "@/lib/worker";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, "Webhook is not configured");
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new HttpError(400, "Missing Stripe signature");
    if (Number(req.headers.get("content-length") || 0) > 1000000)
      throw new HttpError(413, "Payload too large");
    const body = await req.text();
    if (Buffer.byteLength(body) > 1000000)
      throw new HttpError(413, "Payload too large");
    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
      throw new HttpError(400, "Invalid Stripe signature");
    }
    if (event.livemode !== (paymentMode() === "live"))
      throw new HttpError(400, "Wrong payment environment");
    const db = adminDb();
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    ) {
      const sent = event.data.object as Stripe.Checkout.Session;
      const session = await stripe.checkout.sessions.retrieve(sent.id);
      if (session.payment_status !== "paid")
        return NextResponse.json({ received: true });
      const orderId = zOrderId(session.client_reference_id);
      const { data: o } = checked(
        await db
          .from("orders")
          .select("id,customer_id,total,currency,checkout_id,pricing")
          .eq("id", orderId)
          .single(),
      );
      if (
        !o ||
        session.metadata?.order_id !== o.id ||
        session.metadata?.customer_id !== o.customer_id
      )
        throw new HttpError(409, "Payment ownership mismatch");
      try {
        assertOrderPaymentMode(o.pricing?.sandbox);
      } catch {
        throw new HttpError(409, "Order payment environment mismatch");
      }
      const payment =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!payment || session.amount_total === null || !session.currency)
        throw new HttpError(409, "Incomplete captured payment");
      const intent = await stripe.paymentIntents.retrieve(payment, {
        expand: ["latest_charge"],
      });
      let state: "paid" | "refunded" | "disputed";
      try {
        state = capturedState(intent, session.amount_total, session.currency);
      } catch {
        throw new HttpError(409, "Captured payment mismatch");
      }
      checked(
        await db.rpc("apply_payment", {
          p_event: event.id,
          p_order: o.id,
          p_reference: payment,
          p_amount: session.amount_total,
          p_currency: session.currency,
          p_checkout: session.id,
          p_state: "paid",
        }),
      );
      if (state !== "paid")
        checked(
          await db.rpc("apply_payment", {
            p_event: event.id + ":reconciled-" + state,
            p_order: o.id,
            p_reference: payment,
            p_amount: session.amount_total,
            p_currency: session.currency,
            p_checkout: session.id,
            p_state: state,
          }),
        );
    }
    if (
      event.type === "charge.refunded" ||
      event.type === "charge.dispute.created"
    ) {
      let charge: Stripe.Charge;
      if (event.type === "charge.refunded")
        charge = event.data.object as Stripe.Charge;
      else {
        const dispute = event.data.object as Stripe.Dispute;
        charge = await stripe.charges.retrieve(
          typeof dispute.charge === "string"
            ? dispute.charge
            : dispute.charge.id,
        );
      }
      const payment =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (payment) {
        const { data: o } = checked(
          await db
            .from("orders")
            .select("*")
            .eq("payment_ref", payment)
            .maybeSingle(),
        );
        if (o)
          checked(
            await db.rpc("apply_payment", {
              p_event: event.id,
              p_order: o.id,
              p_reference: payment,
              p_amount: o.total,
              p_currency: o.currency,
              p_checkout: o.checkout_id,
              p_state:
                event.type === "charge.refunded" ? "refunded" : "disputed",
            }),
          );
      }
    }
    after(() => drainQueue().then(() => {}));
    return NextResponse.json({ received: true });
  } catch (e) {
    return fail(e);
  }
}
function zOrderId(value: string | null) {
  if (!value || !/^[0-9a-f-]{36}$/i.test(value))
    throw new HttpError(400, "Missing order reference");
  return value;
}
