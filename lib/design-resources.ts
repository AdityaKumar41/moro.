import { z } from "zod";
// Versioned project resources live alongside artwork in the private JSONB design
// document. Public templates and manufacturing proofs use the pure artwork schema.
export const designResourcesSchema = z.object({
  version: z.literal(1).default(1),
  variableData: z
    .array(
      z.record(
        z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,39}$/),
        z.string().max(300),
      ),
    )
    .max(500)
    .default([]),
  uploadPath: z.string().max(300).optional(),
  uploadName: z.string().max(200).optional(),
  savedAt: z.iso.datetime().optional(),
});
export type DesignResources = z.infer<typeof designResourcesSchema>;
export function resourcesForOwner(
  input: unknown,
  ownerId: string,
): DesignResources {
  const result = designResourcesSchema.parse(input ?? {});
  if (
    result.uploadPath &&
    (!result.uploadPath.startsWith(ownerId + "/") ||
      result.uploadPath.includes(".."))
  )
    throw Error("This source artwork belongs to another account.");
  return result;
}
