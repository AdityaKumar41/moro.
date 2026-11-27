import { afterEach, it, expect, vi } from "vitest";
import {
  paymentKey,
  sandboxEnabled,
  checkoutEnabled,
  assertOrderPaymentMode,
} from "../lib/payment-mode";
import { pricingPolicy, price } from "../lib/pricing";
import { defaultConfig } from "../lib/catalog";
afterEach(() => vi.unstubAllEnvs());
it("fails closed if a live key is supplied to a test deployment", () => {
  vi.stubEnv("PAYMENTS_MODE", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
  vi.stubEnv("COMMERCE_ENABLED", "false");
  expect(() => paymentKey()).toThrow();
  expect(sandboxEnabled()).toBe(false);
  expect(checkoutEnabled()).toBe(false);
});
it("allows genuine Stripe test checkout with sample rates while live commerce remains disabled", () => {
  vi.stubEnv("PAYMENTS_MODE", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_fixture");
  vi.stubEnv("COMMERCE_ENABLED", "false");
  expect(paymentKey()).toBe("rk_test_fixture");
  expect(checkoutEnabled()).toBe(true);
  const quote = price(defaultConfig(), pricingPolicy());
  expect(quote.approved).toBe(true);
  expect(quote.sandbox).toBe(true);
});
it("does not let the sandbox exception approve live sample prices or cross payment environments", () => {
  vi.stubEnv("PAYMENTS_MODE", "live");
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_fixture");
  vi.stubEnv("COMMERCE_ENABLED", "false");
  expect(price(defaultConfig(), pricingPolicy()).approved).toBe(false);
  expect(checkoutEnabled()).toBe(false);
  expect(() => assertOrderPaymentMode(true)).toThrow();
  vi.stubEnv("PAYMENTS_MODE", "test");
  expect(() => assertOrderPaymentMode(false)).toThrow();
  expect(() => assertOrderPaymentMode(true)).not.toThrow();
});
