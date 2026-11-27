import { it, expect, vi } from "vitest";
import { orderEmail } from "../lib/mail";
it("builds an escaped branded order email without reflecting HTML from status values", () => {
  vi.stubEnv("APP_URL", "https://store.example");
  try {
    const mail = orderEmail("<script>alert(1)</script>", "order-test", 42);
    expect(mail.subject).toContain("DH-42");
    expect(mail.text).toContain("https://store.example/account");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  } finally {
    vi.unstubAllEnvs();
  }
});

it("keeps preview information in the email footer without a testing subject or heading", () => {
  const mail = orderEmail("payment_received", "sandbox-order", 6, true);
  expect(mail.subject).not.toContain("TEST");
  expect(mail.subject).toContain("moro.");
  expect(mail.text).toContain("no money was charged");
  expect(mail.html).toContain("no money was charged");
  expect(mail.html).not.toContain("SANDBOX TEST");
});
