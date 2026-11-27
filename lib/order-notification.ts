import { orderEmail, type Mail } from "./mail";
import { buildReceipt, type ReceiptOrder } from "./receipt";
export async function orderNotification(
  kind: string,
  order: ReceiptOrder,
  paidAt?: string,
): Promise<Omit<Mail, "to" | "idempotencyKey">> {
  const email = orderEmail(
    kind === "receipt_requested" ? "payment_received" : kind,
    order.id,
    order.number,
    order.pricing.sandbox === true,
  );
  if (!["payment_received", "receipt_requested"].includes(kind)) return email;
  return {
    ...email,
    attachments: [
      {
        filename: `DH-${order.number}-receipt.pdf`,
        content: await buildReceipt(order, paidAt),
        contentType: "application/pdf",
      },
    ],
  };
}
