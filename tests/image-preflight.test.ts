import { it, expect } from "vitest";
import sharp from "sharp";
import { initialArtwork } from "../lib/initial-artwork";
import { preflightPrintImages } from "../lib/image-preflight";
function artwork(bytes: Buffer) {
  const art = initialArtwork();
  art.layers = [
    {
      ...art.layers[0],
      kind: "image",
      text: "",
      image: "data:image/png;base64," + bytes.toString("base64"),
    },
  ];
  return art;
}
it("accepts real decoded pixels and rejects disguised or truncated images before payment", async () => {
  const png = await sharp({
    create: { width: 100, height: 100, channels: 4, background: "#244b37" },
  })
    .png()
    .toBuffer();
  await expect(preflightPrintImages(artwork(png))).resolves.toBeUndefined();
  await expect(
    preflightPrintImages(artwork(Buffer.from("<svg/>"))),
  ).rejects.toThrow("valid PNG");
  await expect(
    preflightPrintImages(artwork(png.subarray(0, 40))),
  ).rejects.toThrow("unreadable");
});
it("checks encoded dimensions instead of trusting compressed file size", async () => {
  const large = await sharp({
    create: { width: 4000, height: 4000, channels: 4, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  expect(large.length).toBeLessThan(200000);
  await expect(preflightPrintImages(artwork(large))).rejects.toThrow(
    "print-image limit",
  );
});
