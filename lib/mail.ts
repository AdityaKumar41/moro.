import nodemailer from "nodemailer";
import { createHash } from "node:crypto";
export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
  attachments?: {
    filename: string;
    content: Uint8Array;
    contentType: string;
  }[];
};
export function mailConfigured() {
  return !!(
    (process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD) ||
    process.env.RESEND_API_KEY
  );
}
export async function sendMail(mail: Mail) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw Error("Email sender is not configured");
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000,
      socketTimeout: 20000,
      tls: { minVersion: "TLSv1.2" },
    });
    const domain = process.env.SMTP_USER.split("@")[1] || "digitalheroes.local";
    const messageId = `<${createHash("sha256").update(mail.idempotencyKey).digest("hex")}@${domain}>`;
    const result = await transport.sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      messageId,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
        contentType: a.contentType,
      })),
    });
    if (result.rejected.length) throw Error("Email recipient was rejected");
    return { id: result.messageId };
  }
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": mail.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments: mail.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
          content_type: a.contentType,
        })),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw Error("Email delivery failed");
    return await response.json();
  }
  throw Error("Email delivery is not configured");
}
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function orderEmail(
  kind: string,
  orderId: string,
  orderNumber?: number,
  sandbox = false,
) {
  const titles: Record<string, string> = {
    payment_received: "Your payment receipt, all in one place.",
    proof_ready: "Your artwork is ready for a closer look.",
    production: "Your idea is going into production.",
    completed: "Good work. Made real.",
  };
  const detail: Record<string, string> = {
    payment_received:
      "Your payment is confirmed and your PDF receipt is attached. Follow your artwork proof and order updates in your account.",
    proof_ready:
      "Review every detail in your account. You can approve your proof or request a revision. Production starts only after your approval.",
    production:
      "Your approved artwork is now in the production queue. Follow its progress from your account.",
    completed:
      "Your print job is complete. Your approved design is saved and ready whenever you need a repeat order.",
  };
  const title = titles[kind] || "A fresh update on your print project.";
  const copy =
    detail[kind] || `Your order status is now ${kind.replaceAll("_", " ")}.`;
  const url = process.env.APP_URL + "/account";
  const label = orderNumber ? "DH-" + orderNumber : orderId.slice(0, 8);
  const modeNote = sandbox
    ? "Preview environment · no money was charged and no physical dispatch is scheduled."
    : "";
  return {
    subject: `moro. · ${label} · ${kind === "payment_received" ? "Payment receipt" : kind.replaceAll("_", " ")}`,
    text: `${title}\n\n${copy}\n\nOrder ${label}\nView your project: ${url}\n\nmoro. — A little idea. A lasting impression.\n${modeNote}`,
    html: `<!doctype html><html><body style="margin:0;background:#fffaf1;font-family:Arial,sans-serif;color:#191b19"><table role="presentation" style="max-width:580px;width:100%;margin:35px auto;background:#fffdf8;border:1px solid #e0dbcf;border-radius:8px"><tr><td style="padding:30px 32px;border-bottom:1px solid #e0dbcf;font-size:30px;font-weight:bold;letter-spacing:-2px">moro<span style="color:#df573c">.</span></td></tr><tr><td style="padding:32px"><p style="font-size:12px;color:#75736b;letter-spacing:1px">YOUR PROJECT · ${escape(label)}</p><h1 style="font-size:32px;line-height:1.15;letter-spacing:-1px;font-weight:500">${escape(title)}</h1><p style="font-size:15px;line-height:1.8;color:#67665e">${escape(copy)}</p><p style="margin-top:28px"><a href="${escape(url)}" style="display:inline-block;padding:15px 25px;background:#191b19;color:#fffaf1;text-decoration:none;border-radius:30px">Open your project</a></p></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #e0dbcf;font-size:12px;line-height:1.7;color:#77746b">A little idea. A lasting impression. · moro.${sandbox ? `<br/><span style="font-size:11px">${modeNote}</span>` : ""}</td></tr></table></body></html>`,
  };
}
