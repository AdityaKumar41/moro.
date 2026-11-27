import sharp from "sharp";
import type { Artwork } from "./catalog";
/** Do not charge for a bitmap that the actual renderer cannot decode. */
export async function preflightPrintImages(artwork: Artwork) {
  let pixels = 0;
  for (const layer of artwork.layers) {
    if (layer.hidden || layer.kind !== "image") continue;
    const encoded = layer.image || "",
      bytes = Buffer.from(encoded.split(",")[1] || "", "base64");
    const png =
      encoded.startsWith("data:image/png;") &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg =
      encoded.startsWith("data:image/jpeg;") &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255;
    if (!png && !jpeg)
      throw Error(
        "One image is not a valid PNG/JPEG. Remove it and upload the original image again.",
      );
    try {
      const image = sharp(bytes, {
          limitInputPixels: 15_000_000,
          failOn: "warning",
        }),
        meta = await image.metadata();
      if (
        !meta.width ||
        !meta.height ||
        !["png", "jpeg"].includes(meta.format || "") ||
        (meta.pages ?? 1) !== 1
      )
        throw Error("Invalid image");
      pixels += meta.width * meta.height;
      if (pixels > 30_000_000) throw Error("Document pixel limit");
      await image.raw().toBuffer();
    } catch {
      throw Error(
        "An image is unreadable or exceeds the print-image limit. Export an optimized PNG/JPEG and upload it again.",
      );
    }
  }
}
