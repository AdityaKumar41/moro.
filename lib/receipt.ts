import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { businessDate } from "./business-date";
export type ReceiptOrder = {
  id: string;
  number: number;
  created_at: string;
  payment_status: string;
  payment_ref: string | null;
  currency: string;
  total: number;
  configuration: {
    productId: string;
    width: number;
    height: number;
    quantity: number;
    material: string;
  };
  artwork?: { name?: string };
  pricing: {
    net: number;
    tax: number;
    goods?: number;
    setup?: number;
    sandbox?: boolean;
  };
  shipping: {
    name?: string;
    email?: string;
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};
export async function buildReceipt(order: ReceiptOrder, paidAt?: string) {
  if (order.payment_status !== "paid")
    throw Error("Receipt available after payment");
  if (
    !Number.isInteger(order.total) ||
    !Number.isInteger(order.pricing.net) ||
    !Number.isInteger(order.pricing.tax) ||
    order.total !== order.pricing.net + order.pricing.tax
  )
    throw Error("Receipt totals do not reconcile");
  const doc = await PDFDocument.create();
  doc.setTitle(`Moro payment receipt DH-${order.number}`);
  doc.setAuthor("Digital Heroes");
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.11, 0.09),
    muted = rgb(0.43, 0.43, 0.39),
    cream = rgb(1, 0.98, 0.95),
    accent = rgb(0.87, 0.34, 0.23);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: cream });
  const safe = (s: string, f: PDFFont) => {
    try {
      f.encodeText(s);
      return s;
    } catch {
      return "Full details available in your account";
    }
  };
  function text(
    value: string,
    x: number,
    y: number,
    size = 11,
    f = font,
    color = ink,
  ) {
    page.drawText(safe(value, f), { x, y, size, font: f, color });
  }
  function wrap(value: string, x: number, y: number, max = 480, size = 11) {
    const source = safe(value, font);
    const lines: string[] = [];
    let line = "";
    for (const word of source.split(/\s+/)) {
      if (line && font.widthOfTextAtSize(line + " " + word, size) > max) {
        lines.push(line);
        line = "";
      }
      // Only split words that cannot fit on a whole line (e.g. long email IDs).
      if (font.widthOfTextAtSize(word, size) > max) {
        for (const char of word) {
          if (line && font.widthOfTextAtSize(line + char, size) > max) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      } else line = line ? line + " " + word : word;
    }
    if (line) lines.push(line.trim());
    const visible = lines.slice(0, 2);
    if (lines.length > 2) {
      let last = visible[1];
      while (last && font.widthOfTextAtSize(last + "...", size) > max)
        last = last.slice(0, -1);
      visible[1] = last + "...";
    }
    visible.forEach((line, i) => text(line, x, y - i * 17, size));
    return y - (visible.length - 1) * 17;
  }
  const amount = (n: number) => `${order.currency} ${(n / 100).toFixed(2)}`;
  text("moro", 42, 780, 34, bold);
  text(".", 127, 780, 34, bold, accent);
  text("BY DIGITAL HEROES", 43, 758, 8, font, muted);
  text("PAYMENT RECEIPT", 360, 787, 12, bold);
  text(`DH-${order.number}`, 360, 766, 21, bold);
  text("Payment confirmed", 360, 747, 10, font, muted);
  page.drawLine({
    start: { x: 42, y: 725 },
    end: { x: 553, y: 725 },
    thickness: 1,
    color: rgb(0.84, 0.82, 0.77),
  });
  text("RECEIPT DETAILS", 42, 697, 9, bold, muted);
  text(`Order date: ${businessDate(order.created_at)}`, 42, 674);
  if (paidAt) text(`Payment date: ${businessDate(paidAt)}`, 42, 656);
  text("CUSTOMER", 330, 697, 9, bold, muted);
  wrap(order.shipping.name || "Account holder", 330, 674, 225);
  wrap(order.shipping.email || "", 330, 637, 225, 9);
  text("YOUR PRINT ORDER", 42, 602, 9, bold, muted);
  wrap(order.artwork?.name || "Custom print", 42, 576, 495, 14);
  wrap(
    `${order.configuration.quantity} x ${order.configuration.productId} | ${order.configuration.width} x ${order.configuration.height} mm | ${order.configuration.material}`,
    42,
    540,
    495,
    10,
  );
  page.drawLine({
    start: { x: 42, y: 514 },
    end: { x: 553, y: 514 },
    thickness: 1,
    color: rgb(0.84, 0.82, 0.77),
  });
  let y = 484;
  for (const [label, value] of [
    ["Print items", order.pricing.goods],
    ["Setup", order.pricing.setup],
    ["Net subtotal", order.pricing.net],
    ["GST included", order.pricing.tax],
  ] as const) {
    if (value === undefined) continue;
    text(label, 42, y, 11, font, muted);
    text(amount(value), 405, y, 11);
    y -= 30;
  }
  page.drawRectangle({ x: 42, y: y - 26, width: 511, height: 52, color: ink });
  text("TOTAL PAID", 59, y - 7, 11, bold, cream);
  text(amount(order.total), 388, y - 7, 19, bold, cream);
  text("PAYMENT REFERENCE", 42, 260, 9, bold, muted);
  wrap(order.payment_ref || "Recorded in your account", 42, 240, 511, 9);
  wrap(
    "You can download this receipt again from your account. Your artwork proof and order updates are kept with your order.",
    42,
    190,
    505,
    10,
  );
  page.drawLine({
    start: { x: 42, y: 110 },
    end: { x: 553, y: 110 },
    thickness: 1,
    color: rgb(0.84, 0.82, 0.77),
  });
  wrap(
    "This is a payment receipt. Statutory GST invoices are issued by the merchant using approved business details.",
    42,
    89,
    511,
    8,
  );
  if (order.pricing.sandbox)
    wrap(
      "Preview order: no money was charged and no physical dispatch is scheduled.",
      42,
      59,
      511,
      8,
    );
  return Buffer.from(await doc.save());
}
