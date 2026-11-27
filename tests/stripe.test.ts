import { it, expect } from "vitest";
import Stripe from "stripe";
const stripe = new Stripe("sk_test_fixture");
it("verifies Stripe signatures against the original raw payload and rejects tampering", () => {
  const payload = JSON.stringify({
    id: "evt_fixture",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_fixture" } },
  });
  const secret = "whsec_fixture";
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe(
    "evt_fixture",
  );
  expect(() =>
    stripe.webhooks.constructEvent(payload + " ", header, secret),
  ).toThrow();
  expect(() =>
    stripe.webhooks.constructEvent(payload, header, "wrong"),
  ).toThrow();
});
it("rejects stale webhook deliveries outside the signature timestamp tolerance", () => {
  const payload = "{}";
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_fixture",
    timestamp: 1,
  });
  expect(() =>
    stripe.webhooks.constructEvent(payload, header, "whsec_fixture"),
  ).toThrow();
});

import { capturedState } from "../lib/stripe-payment";
const intentFixture = (patch: object = {}) =>
  JSON.parse(
    JSON.stringify({
      status: "succeeded",
      amount_received: 12500,
      currency: "inr",
      latest_charge: { amount_refunded: 0, disputed: false },
      ...patch,
    }),
  );
it("does not fulfill uncaptured or mismatched payments", () => {
  for (const patch of [
    { status: "processing" },
    { amount_received: 12499 },
    { currency: "usd" },
    { latest_charge: null },
  ]) {
    expect(() => capturedState(intentFixture(patch), 12500, "INR")).toThrow();
  }
});
it("reconciles a late Checkout event against current refunds and disputes", () => {
  expect(capturedState(intentFixture(), 12500, "INR")).toBe("paid");
  expect(
    capturedState(
      intentFixture({
        latest_charge: { amount_refunded: 100, disputed: false },
      }),
      12500,
      "INR",
    ),
  ).toBe("refunded");
  expect(
    capturedState(
      intentFixture({ latest_charge: { amount_refunded: 0, disputed: true } }),
      12500,
      "INR",
    ),
  ).toBe("disputed");
});
