import { z } from "zod";
export const printProfileSchema = z.object({
  dpi: z.union([z.literal(150), z.literal(300)]).default(300),
  bleedMm: z.number().min(0).max(10).default(3),
});
export const productSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  name: z.string().min(2).max(80),
  short: z.string().min(2).max(40),
  description: z.string().min(5).max(180),
  material: z.array(z.string().min(1).max(60)).min(1).max(12),
  width: z.number().min(10).max(300),
  height: z.number().min(10).max(300),
  rate: z.number().int().min(1).max(1000000),
  setup: z.number().int().min(0).max(10000000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  shape: z.enum(["label", "race", "mtb", "stamp", "trophy", "laser"]),
  taxBps: z.number().int().min(0).max(10000).optional(),
  hsn: z.string().max(12).optional(),
  approved: z.boolean().optional(),
  printProfile: printProfileSchema.optional(),
});
export type Product = z.infer<typeof productSchema>;
export const divisions: Product[] = [
  {
    id: "labels",
    name: "Labels & stickers",
    short: "Labels",
    description: "Small details. Lasting impressions.",
    material: ["Matte vinyl", "Gloss vinyl", "Paper"],
    width: 80,
    height: 80,
    rate: 32,
    setup: 1200,
    color: "#d8ed94",
    shape: "label",
  },
  {
    id: "race",
    name: "Race & event numbers",
    short: "Race numbers",
    description: "Built for every personal best.",
    material: ["Tyvek", "Synthetic paper"],
    width: 210,
    height: 148,
    rate: 18,
    setup: 1800,
    color: "#ffb69d",
    shape: "race",
  },
  {
    id: "mtb",
    name: "MTB boards",
    short: "MTB boards",
    description: "Made for the ride. Ready for the elements.",
    material: ["Polypropylene", "Rigid PVC"],
    width: 180,
    height: 150,
    rate: 35,
    setup: 2200,
    color: "#b4cce9",
    shape: "mtb",
  },
  {
    id: "stamps",
    name: "Custom stamps",
    short: "Stamps",
    description: "Make your mark, again and again.",
    material: ["Rubber", "Self-inking"],
    width: 60,
    height: 30,
    rate: 250,
    setup: 1500,
    color: "#d9c6ee",
    shape: "stamp",
  },
  {
    id: "trophies",
    name: "Trophies & awards",
    short: "Trophies",
    description: "For moments that deserve more.",
    material: ["Acrylic", "Bamboo"],
    width: 100,
    height: 180,
    rate: 320,
    setup: 3500,
    color: "#f7d897",
    shape: "trophy",
  },
  {
    id: "laser",
    name: "Laser-cut work",
    short: "Laser cut",
    description: "Precision in every possibility.",
    material: ["Birch plywood", "Acrylic"],
    width: 150,
    height: 150,
    rate: 180,
    setup: 2800,
    color: "#cdb6a3",
    shape: "laser",
  },
];
export type ProductId = string;
export const configSchema = z.object({
  productId: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/),
  width: z.number().min(10).max(300),
  height: z.number().min(10).max(300),
  quantity: z.number().int().min(1).max(500),
  material: z.string().min(1).max(60),
});
export type Configuration = z.infer<typeof configSchema>;
export function defaultConfig(
  productId: ProductId = "labels",
  catalog: Product[] = divisions,
): Configuration {
  const p = catalog.find((p) => p.id === productId) || catalog[0];
  return {
    productId,
    width: p.width,
    height: p.height,
    quantity: 100,
    material: p.material[0],
  };
}
export const layerSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(["text", "image"]),
    text: z.string().max(300),
    label: z.string().max(100).optional(),
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
    x: z.number().min(0).max(1000),
    y: z.number().min(0).max(1000),
    width: z.number().min(20).max(1000),
    height: z.number().min(20).max(1000),
    rotation: z.number().min(-180).max(180),
    size: z.number().min(12).max(240),
    tracking: z.number().min(-100).max(400).optional(),
    minFontPt: z.number().min(6).max(144).optional(),
    maxFontPt: z.number().min(6).max(144).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    font: z.enum(["sans", "serif", "mono"]),
    image: z.string().max(1500000).optional(),
  })
  .superRefine((l, ctx) => {
    if ((l.minFontPt ?? 6) > (l.maxFontPt ?? 144))
      ctx.addIssue({
        code: "custom",
        message: "Minimum font size must not exceed maximum font size.",
      });
    // Physical bounds depend on the product aspect ratio; validateArtwork checks
    // them with the configuration, rather than assuming a square canvas here.
    if (
      l.kind === "image" &&
      !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(l.image ?? "")
    )
      ctx.addIssue({
        code: "custom",
        message: "Images must be normalized PNG or JPEG images",
      });
  });
export const designSchema = z.object({
  source: z
    .object({
      version: z.literal(1),
      path: z.string().max(300),
      imageHash: z.string().regex(/^[a-f0-9]{64}$/),
      signature: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .optional(),
  name: z.string().min(1).max(100),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layers: z.array(layerSchema).max(30),
});
export type Artwork = z.infer<typeof designSchema>;
export type Layer = z.infer<typeof layerSchema>;
export const stages = [
  "quote",
  "order",
  "artwork",
  "proof",
  "production",
  "completed",
] as const;
export function money(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount / 100,
  );
}

export function fitsPrintArea(
  l: Layer,
  c: Pick<Configuration, "width" | "height">,
) {
  const r = (l.rotation * Math.PI) / 180;
  const w = (l.width / 1000) * c.width,
    h = (l.height / 1000) * c.height;
  const extentX = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r));
  const extentY = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
  const x = (l.x / 1000) * c.width,
    y = (l.y / 1000) * c.height;
  return (
    x - extentX / 2 >= -1e-6 &&
    x + extentX / 2 <= c.width + 1e-6 &&
    y - extentY / 2 >= -1e-6 &&
    y + extentY / 2 <= c.height + 1e-6
  );
}
export function validateArtwork(a: Artwork, c: Configuration) {
  const artwork = designSchema.parse(a);
  if (!artwork.layers.some((l) => !l.hidden))
    throw new z.ZodError([
      {
        code: "custom",
        message: "Add a visible text or image element before ordering.",
        path: ["layers"],
      },
    ]);
  if (artwork.layers.filter((l) => !l.hidden).some((l) => !fitsPrintArea(l, c)))
    throw new z.ZodError([
      {
        code: "custom",
        message: "A rotated element extends beyond the physical print area",
        path: ["layers"],
      },
    ]);
  return artwork;
}
