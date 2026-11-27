import Stripe from "stripe";
import { paymentKey, paymentMode } from "./payment-mode";
export function stripeClient() {
  return new Stripe(paymentKey(), { maxNetworkRetries: 2, timeout: 15000 });
}
export const stripeMode = paymentMode;
