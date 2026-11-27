import { describe, it, expect } from "vitest";
import { price } from "../lib/pricing";
import {
  fitsPrintArea,
  defaultConfig,
  designSchema,
  validateArtwork,
} from "../lib/catalog";
import { orderSchema } from "../lib/orders";
const base = defaultConfig();
describe("price boundaries and trust", () => {
  it("applies the volume discount exactly at the quantity floor", () => {
    expect(price({ ...base, quantity: 99 }).discountBps).toBe(0);
    expect(price({ ...base, quantity: 100 }).discountBps).toBe(1000);
    expect(price({ ...base, quantity: 249 }).discountBps).toBe(1000);
    expect(price({ ...base, quantity: 250 }).discountBps).toBe(2000);
    expect(price({ ...base, quantity: 500 }).discountBps).toBe(2500);
  });
  it("keeps money in integer paise and reconciles totals", () => {
    for (let quantity = 1; quantity <= 500; quantity++) {
      const p = price({ ...base, quantity, width: 83, height: 71 });
      expect(Number.isInteger(p.total)).toBe(true);
      expect(p.total).toBe(p.goods + p.setup + p.tax);
      expect(p.net).toBe(p.goods + p.setup);
    }
  });
  it("rejects unoffered materials, invalid dimensions and negative quantities", () => {
    expect(() => price({ ...base, material: "free" })).toThrow();
    expect(() => price({ ...base, width: -1 })).toThrow();
    expect(() => price({ ...base, quantity: 0 })).toThrow();
    expect(() => price({ ...base, quantity: 1.5 })).toThrow();
  });
});
const layer = {
  id: "4e2526a8-557b-4a66-bdd7-ac2d26109bc0",
  kind: "text",
  text: "HELLO",
  x: 500,
  y: 500,
  width: 800,
  height: 200,
  rotation: 0,
  size: 90,
  color: "#123456",
  font: "sans",
};
describe("print constraints", () => {
  it("rejects rotated corners even if the unrotated box fits", () => {
    expect(() =>
      validateArtwork(
        designSchema.parse({
          name: "test",
          background: "#ffffff",
          layers: [{ ...layer, x: 410, y: 200, rotation: 45 }],
        }),
        base,
      ),
    ).toThrow();
  });
  it("accepts a producible centered element", () => {
    expect(
      designSchema.safeParse({
        name: "test",
        background: "#ffffff",
        layers: [layer],
      }).success,
    ).toBe(true);
  });
  it("rejects external logo URLs and SVG payloads", () => {
    for (const image of [
      "https://example.org/logo.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
    ])
      expect(
        designSchema.safeParse({
          name: "test",
          background: "#ffffff",
          layers: [{ ...layer, kind: "image", image }],
        }).success,
      ).toBe(false);
  });
  it("rejects bulk jobs whose CSV row count differs from the purchased quantity", () => {
    expect(
      orderSchema.safeParse({
        requestKey: crypto.randomUUID(),
        configuration: base,
        artwork: { name: "test", background: "#ffffff", layers: [layer] },
        variableData: [{ name: "One" }],
        shipping: {
          name: "Test Maker",
          email: "test@example.com",
          phone: "9999999999",
          line1: "123 Test Street",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
          gstin: "",
        },
      }).success,
    ).toBe(false);
  });
});

it("validates rotated artwork in physical dimensions for narrow products", () => {
  const l = { ...layer, x: 500, y: 500, width: 600, height: 200, rotation: 10 };
  expect(
    designSchema.safeParse({ name: "test", background: "#ffffff", layers: [l] })
      .success,
  ).toBe(true);
  expect(
    fitsPrintArea(l as Parameters<typeof fitsPrintArea>[0], {
      width: 300,
      height: 20,
    }),
  ).toBe(false);
});
