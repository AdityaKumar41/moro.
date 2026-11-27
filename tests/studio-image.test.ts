import { it, expect } from "vitest";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { imageBox } from "../lib/studio-image";
import { defaultConfig, designSchema, type Artwork } from "../lib/catalog";
import { renderArtwork } from "../lib/render";

it("preserves physical image proportions across square, portrait and landscape print areas", () => {
  for (const [w, h] of [
    [80, 80],
    [200, 50],
    [50, 200],
  ]) {
    for (const [iw, ih] of [
      [1200, 800],
      [800, 1200],
      [1000, 1000],
    ]) {
      const box = imageBox(iw, ih, w, h);
      expect((box.width * w) / (box.height * h)).toBeCloseTo(iw / ih, 5);
      expect(Math.max(box.width, box.height)).toBe(650);
    }
  }
});
it("accepts normalized JPEG and transparent PNG through validation and actual proof rendering", async () => {
  for (const format of ["jpeg", "png"] as const) {
    const buffer = await sharp({
      create: {
        width: 120,
        height: 60,
        channels: 4,
        background: { r: 230, g: 30, b: 15, alpha: format === "png" ? 0.5 : 1 },
      },
    })
      [format]()
      .toBuffer();
    const artwork: Artwork = {
      name: "Image regression",
      background: "#ffffff",
      layers: [
        {
          id: crypto.randomUUID(),
          kind: "image",
          text: "photo-{{not_a_csv_column}}.jpg",
          image: `data:image/${format};base64,${buffer.toString("base64")}`,
          x: 500,
          y: 500,
          width: 650,
          height: 325,
          rotation: 0,
          size: 80,
          color: "#000000",
          font: "sans",
        },
      ],
    };
    expect(designSchema.safeParse(artwork).success).toBe(true);
    const rendered = await renderArtwork(artwork, defaultConfig(), {}, 150);
    const { data, info } = await sharp(rendered.png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const offset =
      (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) *
      info.channels;
    expect(data[offset]).toBeGreaterThan(200);
    expect(data[offset + 1]).toBeLessThan(format === "png" ? 160 : 60);
    if (format === "png") expect(data[offset + 1]).toBeGreaterThan(100);
    expect((await PDFDocument.load(rendered.pdf)).getPageCount()).toBe(1);
  }
});
