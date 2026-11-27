import { it, expect, vi, afterEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import nodemailer from "nodemailer";
import { orderNotification } from "../lib/order-notification";
import { sendMail } from "../lib/mail";
import { buildReceipt, type ReceiptOrder } from "../lib/receipt";
const order: ReceiptOrder = {
  id: "fixture",
  number: 12,
  created_at: "2026-11-26T21:00:00Z",
  payment_status: "paid",
  payment_ref: "pi_fixture",
  currency: "INR",
  total: 4814,
  configuration: {
    productId: "nameplate",
    width: 150,
    height: 100,
    quantity: 1,
    material: "acrylic",
  },
  artwork: { name: "Morning people" },
  pricing: { net: 4080, tax: 734, goods: 2080, setup: 2000, sandbox: true },
  shipping: { name: "Account holder", email: "owner@example.com" },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("attaches a readable PDF to automatic and requested payment receipts, but not proof alerts", async () => {
  for (const kind of ["payment_received", "receipt_requested"]) {
    const email = await orderNotification(kind, order, "2026-11-27T01:00:00Z");
    expect(email.text).toMatch(/receipt.*attached/i);
    expect(email.subject).toContain("Payment receipt");
    expect(email.attachments).toHaveLength(1);
    expect(email.attachments![0].filename).toBe("DH-12-receipt.pdf");
    const pdf = await PDFDocument.load(email.attachments![0].content);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toContain("DH-12");
  }
  expect(
    (await orderNotification("proof_ready", order)).attachments,
  ).toBeUndefined();
});
it("refuses receipts for unpaid orders and inconsistent totals", async () => {
  await expect(
    buildReceipt({ ...order, payment_status: "unpaid" }),
  ).rejects.toThrow("after payment");
  await expect(buildReceipt({ ...order, total: 4815 })).rejects.toThrow(
    "reconcile",
  );
});
it("handles long and multilingual customer names without failing delivery", async () => {
  for (const name of ["x".repeat(300), "आदित्य कुमार"]) {
    const pdf = await buildReceipt({
      ...order,
      shipping: { ...order.shipping, name },
      artwork: { name: "long".repeat(50) },
    });
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  }
});
it("passes actual attachment bytes through the Gmail SMTP transport", async () => {
  vi.stubEnv("EMAIL_FROM", "Moro <owner@example.com>");
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_USER", "owner@example.com");
  vi.stubEnv("SMTP_PASSWORD", "fixture");
  const send = vi
    .fn()
    .mockResolvedValue({ rejected: [], messageId: "fixture" });
  vi.spyOn(nodemailer, "createTransport").mockReturnValue({
    sendMail: send,
  } as never);
  const email = await orderNotification("payment_received", order);
  await sendMail({
    ...email,
    to: "owner@example.com",
    idempotencyKey: "receipt/fixture",
  });
  const attachment = send.mock.calls[0][0].attachments[0];
  expect(attachment.contentType).toBe("application/pdf");
  expect(
    attachment.content.equals(Buffer.from(email.attachments![0].content)),
  ).toBe(true);
});
it("encodes the same PDF bytes for the alternate email provider", async () => {
  vi.stubEnv("EMAIL_FROM", "owner@example.com");
  vi.stubEnv("SMTP_HOST", "");
  vi.stubEnv("RESEND_API_KEY", "fixture");
  const send = vi.fn().mockResolvedValue(Response.json({ id: "fixture" }));
  vi.stubGlobal("fetch", send);
  const email = await orderNotification("receipt_requested", order);
  await sendMail({
    ...email,
    to: "owner@example.com",
    idempotencyKey: "receipt/fixture",
  });
  const payload = JSON.parse(send.mock.calls[0][1].body);
  expect(
    Buffer.from(payload.attachments[0].content, "base64").equals(
      Buffer.from(email.attachments![0].content),
    ),
  ).toBe(true);
  expect(send.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
    "receipt/fixture",
  );
});
