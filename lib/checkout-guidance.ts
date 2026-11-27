// Public Stripe fixture: India-issued Visa, not a payment credential.
export const INDIA_TEST_CARD = "4000 0035 6000 0008";
export const INDIA_TEST_CHECKOUT_NOTE =
  "India preview: choose Card and use 4000 0035 6000 0008, a future expiry, any 3-digit CVC and an India billing address. Complete the 3-D Secure test prompt. The common 4242 test card is US-issued and may be declined by this account. No real money is charged.";
export const CHECKOUT_RETURN_KEY = "moro-checkout-return-order";
export function validReturnOrder(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}
export function paymentReturnNotice(
  kind: string,
  order: { payment_status: string } | undefined,
  timedOut = false,
) {
  if (kind === "cancelled")
    return "Checkout closed. Your order is saved and you can try payment again.";
  if (kind !== "processing") return "";
  if (order?.payment_status === "paid")
    return "Payment confirmed. Your order and available proofs are below.";
  if (order?.payment_status === "refunded")
    return "This payment has been refunded. Check your order below.";
  if (order?.payment_status === "disputed")
    return "This payment is under review. Check your order below.";
  return timedOut
    ? "Payment confirmation is taking longer than expected. Refresh your orders before trying another payment."
    : "Checking your payment confirmation. Your order updates only after Stripe verifies the payment.";
}
