import { INDIA_TEST_CHECKOUT_NOTE } from "@/lib/checkout-guidance";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  actor,
  checked,
  fail,
  HttpError,
  jsonBody,
  limit,
  sameOrigin,
} from "@/lib/http";
import { adminDb } from "@/lib/db";
import { checkoutEnabled, assertOrderPaymentMode } from "@/lib/payment-mode";
import { stripeClient, stripeMode } from "@/lib/stripe";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor();
    await limit("checkout:" + u.id, 8);
    if (!checkoutEnabled())
      throw new HttpError(
        503,
        "Checkout is being connected. Your saved design is ready in your account.",
      );
    const { orderId } = z
      .object({ orderId: z.uuid() })
      .parse(await jsonBody(req));
    const db = adminDb();
    const { data: o } = checked(
      await db
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("customer_id", u.id)
        .single(),
    );
    if (!o) throw new HttpError(404, "Order not found");
    if (o.payment_status !== "unpaid")
      throw new HttpError(409, "This order is already paid");
    try {
      assertOrderPaymentMode(o.pricing?.sandbox);
    } catch {
      throw new HttpError(
        409,
        "Create a new order for this payment environment.",
      );
    }
    const stripe = stripeClient();
    if (stripeMode() === "live") {
      const account = await stripe.accounts.retrieve();
      if (!account.charges_enabled)
        throw new HttpError(
          503,
          "Stripe has paused payment acceptance for this store. Your order is saved; the merchant must resolve its Stripe account requirements.",
        );
    }
    let previous = o.checkout_id?.startsWith("cs_")
      ? await stripe.checkout.sessions.retrieve(o.checkout_id)
      : undefined;
    if (previous?.status === "open" && previous.url)
      return NextResponse.json({ url: previous.url, orderId: o.id });
    if (previous?.status === "complete")
      throw new HttpError(
        409,
        "Your payment is being confirmed. Refresh your account shortly.",
      );
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        branding_settings: {
          display_name: "moro.",
          background_color: "#f7f8f2",
          button_color: "#283c26",
          border_style: "rounded",
        },
        ...(stripeMode() === "test"
          ? {
              custom_text: {
                submit: {
                  message: INDIA_TEST_CHECKOUT_NOTE,
                },
              },
            }
          : {}),
        client_reference_id: o.id,
        customer_email: o.shipping.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: o.currency.toLowerCase(),
              unit_amount: o.total,
              product_data: {
                name: `${o.configuration.quantity} × ${o.configuration.productId} · DH-${o.number}`,
                description: `${o.configuration.width} × ${o.configuration.height} mm · ${o.configuration.material} · setup and applicable tax included`,
              },
            },
          },
        ],
        metadata: { order_id: o.id, customer_id: u.id },
        payment_intent_data: {
          metadata: { order_id: o.id, customer_id: u.id },
          description: `Moro DH-${o.number}`,
        },
        success_url:
          process.env.APP_URL + "/account?payment=processing&order=" + o.id,
        cancel_url:
          process.env.APP_URL + "/account?payment=cancelled&order=" + o.id,
        submit_type: "pay",
        billing_address_collection: "required",
      },
      { idempotencyKey: `dh-checkout-${o.id}-${previous?.id || "initial"}` },
    );
    checked(
      await db
        .from("orders")
        .update({ checkout_id: session.id, checkout_url: session.url })
        .eq("id", o.id)
        .eq("payment_status", "unpaid"),
    );
    return NextResponse.json({ url: session.url, orderId: o.id });
  } catch (e) {
    return fail(e);
  }
}
