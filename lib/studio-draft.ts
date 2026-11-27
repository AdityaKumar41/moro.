import { layerTextGeometry } from "./print-text";
import { z } from "zod";
import { configSchema, designSchema, validateArtwork } from "./catalog";
export const DRAFT_KEY = "moro-studio-draft-v1";
export const DRAFT_TTL = 24 * 60 * 60 * 1000;
export const draftSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number().finite(),
  ownerId: z.uuid().nullable(),
  designId: z.uuid(),
  configuration: configSchema,
  artwork: designSchema,
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
});
export type StudioDraft = z.infer<typeof draftSchema>;
export function parseDraft(
  raw: string | null,
  ownerId: string | null,
  now = Date.now(),
): StudioDraft | null {
  if (!raw || raw.length > 2100000) return null;
  try {
    const d = draftSchema.parse(JSON.parse(raw));
    if (
      now - d.updatedAt > DRAFT_TTL ||
      d.updatedAt > now + 60000 ||
      (d.ownerId && d.ownerId !== ownerId)
    )
      return null;
    // An incomplete size change may be recovered, but never sent to commerce before preflight.
    if (
      d.uploadPath &&
      (!d.ownerId ||
        !d.uploadPath.startsWith(d.ownerId + "/") ||
        d.uploadPath.includes(".."))
    )
      return null;
    return d;
  } catch {
    return null;
  }
}
export function persistDraft(
  storage: Pick<Storage, "setItem">,
  draft: StudioDraft,
) {
  const parsed = draftSchema.parse(draft);
  const raw = JSON.stringify(parsed);
  if (raw.length > 2100000)
    throw Error(
      "This draft is too large to keep in this tab. Sign in and save your project.",
    );
  storage.setItem(DRAFT_KEY, raw);
}
export function studioIssues(
  artwork: unknown,
  configuration: unknown,
  rows: Record<string, string>[] = [],
): string[] {
  const a = designSchema.safeParse(artwork),
    c = configSchema.safeParse(configuration);
  if (!a.success || !c.success)
    return ["Complete the product and artwork details."];
  const issues: string[] = [];
  if (!a.data.layers.some((l) => !l.hidden))
    return ["Add a visible text or image element before ordering."];
  try {
    validateArtwork(a.data, c.data);
  } catch {
    issues.push(
      "An artwork element is outside the print area. Adjust its size, rotation or position.",
    );
  }
  if (
    a.data.layers.some(
      (layer) =>
        !layer.hidden &&
        layer.kind === "text" &&
        (rows.length ? rows : [{}]).some(
          (row) =>
            !layerTextGeometry(
              layer.text.replace(
                /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
                (_, key) => row[key] ?? "",
              ),
              layer,
              c.data,
            ).fits,
        ),
    )
  )
    issues.push(
      "Text is below its minimum print size. Enlarge the text area or shorten its content.",
    );
  const keys = [
    ...new Set(
      a.data.layers
        .filter((l) => !l.hidden && l.kind === "text")
        .flatMap((l) =>
          Array.from(
            l.text.matchAll(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g),
            (m) => m[1],
          ),
        ),
    ),
  ];
  if (rows.length && rows.length !== c.data.quantity)
    issues.push("CSV row count must match the quantity.");
  if (
    keys.length &&
    (!rows.length ||
      rows.some((row) =>
        keys.some((key) => !Object.prototype.hasOwnProperty.call(row, key)),
      ))
  )
    issues.push("Add a CSV with columns: " + keys.join(", ") + ".");
  return issues;
}
