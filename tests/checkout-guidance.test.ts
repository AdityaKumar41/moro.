import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { TestPaymentGuide } from "../components/test-payment-guide";
import {
  INDIA_TEST_CARD,
  INDIA_TEST_CHECKOUT_NOTE,
  paymentReturnNotice,
  validReturnOrder,
} from "../lib/checkout-guidance";
it("provides the India-issued fixture, billing and authentication steps together at the payment boundary", () => {
  const html = renderToStaticMarkup(
    createElement(TestPaymentGuide, { enabled: true }),
  );
  expect(html).toContain(INDIA_TEST_CARD);
  expect(html).toContain("India");
  expect(html).toContain("3-D Secure");
  expect(html).toContain("4242");
  expect(INDIA_TEST_CHECKOUT_NOTE).toContain(INDIA_TEST_CARD);
});
it("does not show test-card instructions in live mode", () => {
  expect(
    renderToStaticMarkup(createElement(TestPaymentGuide, { enabled: false })),
  ).toBe("");
});
it("never infers payment success from the return URL alone", () => {
  expect(paymentReturnNotice("processing", undefined)).toContain("Checking");
  expect(
    paymentReturnNotice("processing", { payment_status: "unpaid" }),
  ).not.toContain("Payment confirmed");
  expect(
    paymentReturnNotice("processing", { payment_status: "paid" }),
  ).toContain("Payment confirmed");
  expect(
    paymentReturnNotice("processing", { payment_status: "refunded" }),
  ).toContain("refunded");
  expect(
    paymentReturnNotice("processing", { payment_status: "disputed" }),
  ).toContain("under review");
  expect(paymentReturnNotice("processing", undefined, true)).toContain(
    "before trying another payment",
  );
  expect(paymentReturnNotice("cancelled", undefined)).toContain(
    "order is saved",
  );
});
it("accepts only an opaque order UUID for identifying the return order", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  expect(validReturnOrder(id)).toBe(id);
  for (const input of [
    null,
    "https://evil.test",
    "//evil.test",
    "<script>",
    "paid",
    "../account",
  ])
    expect(validReturnOrder(input)).toBeNull();
});
