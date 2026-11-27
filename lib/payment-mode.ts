export function paymentMode(): "test" | "live" {
  const mode = process.env.PAYMENTS_MODE || "test";
  if (mode !== "test" && mode !== "live")
    throw Error("Invalid payment environment");
  return mode;
}
export function sandboxEnabled() {
  return (
    paymentMode() === "test" &&
    /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || "")
  );
}
export function paymentKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !new RegExp(`^(sk|rk)_${paymentMode()}_`).test(key)) {
    throw Error("Stripe key does not match the configured payment environment");
  }
  return key;
}
export function checkoutEnabled() {
  return (
    sandboxEnabled() ||
    (paymentMode() === "live" && process.env.COMMERCE_ENABLED === "true")
  );
}
export function assertOrderPaymentMode(sandbox: unknown) {
  if ((sandbox === true) !== (paymentMode() === "test"))
    throw Error("This order belongs to a different payment environment");
}
