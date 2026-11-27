/** Image import shares the same bounded, embedded format used by saved artwork. */
export const IMAGE_LIMIT = 1_500_000;
export const ARTWORK_LIMIT = 1_800_000;
export function imageBox(
  width: number,
  height: number,
  printWidth: number,
  printHeight: number,
) {
  const ratio = (width / height) * (printHeight / printWidth);
  return ratio >= 1
    ? { width: 650, height: Math.max(20, 650 / ratio) }
    : { width: Math.max(20, 650 * ratio), height: 650 };
}
export async function importStudioImage(file: File, budget = IMAGE_LIMIT) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5_000_000
  )
    throw Error("Choose a PNG, JPEG or WebP image under 5 MB.");
  if (budget < 40_000)
    throw Error("This design is full. Remove an image before adding another.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error(
      "We couldn’t read that image. Export it as PNG or JPEG and try again.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 16_000_000
    )
      throw Error("Choose an image up to 16 megapixels.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw Error("Your browser could not open the image editor.");
    // JPEG stays JPEG. PNG/WebP use lossless PNG to preserve transparent artwork.
    const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 12; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL(mime, 0.86);
      if (image.length <= Math.min(IMAGE_LIMIT, budget))
        return { image, width: canvas.width, height: canvas.height };
      scale *= 0.78;
    }
    throw Error(
      "This image has too much detail for the remaining design space. Remove another image and try again.",
    );
  } finally {
    bitmap.close();
  }
}
