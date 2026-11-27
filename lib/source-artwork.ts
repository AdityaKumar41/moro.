import { Worker } from "node:worker_threads";
import { resolve } from "node:path";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  configSchema,
  designSchema,
  type Artwork,
  type Configuration,
} from "./catalog";
export const sourceSchema = z.object({
  version: z.literal(1),
  path: z.string().min(1).max(300),
  imageHash: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});
export type PreparedSource = z.infer<typeof sourceSchema>;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
function signingKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw Error("Artwork preparation is not configured");
  return key;
}
export function sealSource(
  path: string,
  image: string,
  key = signingKey(),
): PreparedSource {
  const imageHash = hash(image);
  return {
    version: 1,
    path,
    imageHash,
    signature: createHmac("sha256", key)
      .update("moro-source-v1\0" + path + "\0" + imageHash)
      .digest("hex"),
  };
}
export function verifyPreparedSource(
  artwork: Artwork,
  path: string,
  key = signingKey(),
) {
  const s = sourceSchema.safeParse(artwork.source);
  if (!s.success || s.data.path !== path) return false;
  const expected = sealSource(path, "", key);
  expected.signature = createHmac("sha256", key)
    .update("moro-source-v1\0" + path + "\0" + s.data.imageHash)
    .digest("hex");
  return (
    timingSafeEqual(
      Buffer.from(expected.signature, "hex"),
      Buffer.from(s.data.signature, "hex"),
    ) &&
    artwork.layers.some(
      (l) =>
        l.kind === "image" &&
        !l.hidden &&
        l.image &&
        hash(l.image) === s.data.imageHash,
    )
  );
}
export async function prepareSource(
  bytes: Buffer,
  name: string,
  configuration: Configuration,
  dpi = 300,
) {
  const c = configSchema.parse(configuration),
    ext = name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "ai", "svg", "png"].includes(ext))
    throw Error("Accepted formats: PDF, AI, SVG and PNG.");
  if (!bytes.length || bytes.length > 20_971_520)
    throw Error("Choose source artwork up to 20 MB.");
  if (![150, 300].includes(dpi)) throw Error("Invalid print resolution.");
  const maxWidth = Math.ceil((c.width / 25.4) * dpi),
    maxHeight = Math.ceil((c.height / 25.4) * dpi);
  if (maxWidth * maxHeight > 15_000_000)
    throw Error("This print size exceeds the rendering limit.");
  return new Promise<{
    image: string;
    width: number;
    height: number;
    format: string;
  }>((resolveResult, reject) => {
    const worker = new Worker(
      resolve(process.cwd(), "lib/source-render.worker.mjs"),
      {
        workerData: { bytes, ext, maxWidth, maxHeight },
        resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
      },
    );
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(
        Error(
          "Artwork preparation timed out. Simplify the file and try again.",
        ),
      );
    }, 25000);
    let done = false;
    worker.once("message", (message) => {
      done = true;
      clearTimeout(timer);
      void worker.terminate();
      if (message.ok) resolveResult(message.value);
      else reject(Error(message.error));
    });
    worker.once("error", () => {
      done = true;
      clearTimeout(timer);
      reject(
        Error("Artwork could not be prepared. Export a flattened PDF or PNG."),
      );
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (!done)
        reject(
          Error(
            "Artwork preparation stopped. Simplify the file and try again.",
          ),
        );
    });
  });
}
export function sourceArtwork(
  image: { image: string; width: number; height: number },
  c: Configuration,
  name: string,
): Artwork {
  const ratio = image.width / image.height / (c.width / c.height),
    width = ratio >= 1 ? 1000 : 1000 * ratio,
    height = ratio >= 1 ? 1000 / ratio : 1000;
  return designSchema.parse({
    name: name.slice(0, 100) || "Imported artwork",
    background: "#ffffff",
    layers: [
      {
        id: crypto.randomUUID(),
        label: "Source artwork",
        kind: "image",
        text: "",
        image: image.image,
        x: 500,
        y: 500,
        width,
        height,
        rotation: 0,
        size: 80,
        color: "#000000",
        font: "sans",
      },
    ],
  });
}
