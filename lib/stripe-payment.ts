import type Stripe from "stripe";

// A Checkout session stays "paid" after a refund. Inspect the current charge
// so a delayed completion event cannot reopen refunded or disputed work.
export function capturedState(
  intent: Stripe.PaymentIntent,
  amount: number,
  currency: string,
) {
  if (
    intent.status !== "succeeded" ||
    intent.amount_received !== amount ||
    intent.currency.toLowerCase() !== currency.toLowerCase()
  ) {
    throw new Error("Captured payment does not match the order");
  }
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string")
    throw new Error("Captured charge is unavailable");
  if (charge.disputed) return "disputed";
  if (charge.amount_refunded > 0) return "refunded";
  return "paid";
}
