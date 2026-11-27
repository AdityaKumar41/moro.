import { z } from "zod";
import { designSchema, configSchema, validateArtwork } from "./catalog";
import { designResourcesSchema, resourcesForOwner } from "./design-resources";
import { adminDb } from "./db";
import { checked, HttpError } from "./http";
export const saveDesignSchema = z.object({
  id: z.uuid().optional(),
  ownerId: z.uuid().optional(),
  artwork: designSchema,
  configuration: configSchema,
  resources: designResourcesSchema.optional(),
});
export async function saveDesignForOwner(owner: string, input: unknown) {
  const b = saveDesignSchema.parse(input);
  if (b.ownerId && b.ownerId !== owner)
    throw new HttpError(
      409,
      "Your account changed. Reload before saving this design.",
    );
  if (b.artwork.layers.some((l) => !l.hidden))
    validateArtwork(b.artwork, b.configuration);
  let resources;
  try {
    resources = resourcesForOwner(b.resources, owner);
  } catch {
    throw new HttpError(400, "Invalid project resource ownership");
  }
  const db = adminDb();
  if (resources.uploadPath) {
    const { data, error } = await db.storage
      .from("artwork")
      .info(resources.uploadPath);
    if (error || !data)
      throw new HttpError(
        400,
        "Source artwork is unavailable. Attach it again before saving.",
      );
  }
  const id = b.id || crypto.randomUUID();
  const values = {
    customer_id: owner,
    name: b.artwork.name,
    configuration: b.configuration,
    artwork: {
      ...b.artwork,
      resources: { ...resources, savedAt: new Date().toISOString() },
    },
  };
  checked(
    await db
      .from("designs")
      .upsert({ id, ...values }, { onConflict: "id", ignoreDuplicates: true }),
  );
  const { data } = checked(
    await db
      .from("designs")
      .update(values)
      .eq("id", id)
      .eq("customer_id", owner)
      .select("id")
      .single(),
  );
  return data!;
}
