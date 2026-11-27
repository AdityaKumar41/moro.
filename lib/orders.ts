import { z } from "zod";
import { fitsPrintArea, configSchema, designSchema } from "./catalog";
export const shippingSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  phone: z.string().regex(/^\+?[0-9\s-]{10,16}$/),
  line1: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/),
  gstin: z
    .string()
    .regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
});
export const orderSchema = z
  .object({
    requestKey: z.uuid(),
    designId: z.uuid().optional(),
    uploadName: z.string().max(200).optional(),
    configuration: configSchema,
    artwork: designSchema,
    shipping: shippingSchema,
    variableData: z
      .array(
        z.record(
          z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,39}$/),
          z.string().max(300),
        ),
      )
      .max(500)
      .default([]),
    uploadPath: z.string().min(1).max(300).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.artwork.layers.some((l) => !l.hidden))
      ctx.addIssue({
        code: "custom",
        message: "Add a visible text or image element before ordering",
        path: ["artwork", "layers"],
      });
    const keys = v.artwork.layers
      .filter((l) => !l.hidden && l.kind === "text")
      .flatMap((l) =>
        Array.from(
          l.text.matchAll(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g),
          (m) => m[1],
        ),
      );
    if (
      keys.length &&
      (!v.variableData.length ||
        v.variableData.some((row) =>
          keys.some((key) => !Object.prototype.hasOwnProperty.call(row, key)),
        ))
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Upload CSV data containing every artwork placeholder column before ordering",
      });

    if (
      v.artwork.layers.some(
        (l) => !l.hidden && !fitsPrintArea(l, v.configuration),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "An element is outside the physical print area",
      });
    if (
      v.variableData.length &&
      v.variableData.length !== v.configuration.quantity
    )
      ctx.addIssue({
        code: "custom",
        message: "CSV rows must match the order quantity",
      });
  });
