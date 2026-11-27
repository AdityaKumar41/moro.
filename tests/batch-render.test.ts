import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { renderArtwork } from "../lib/render";
import { defaultConfig, type Artwork } from "../lib/catalog";

it("renders 500 distinct CSV rows without omissions and preserves representative output geometry", async () => {
  const configuration = { ...defaultConfig("race"), width: 80, height: 50 };
  const artwork: Artwork = {
    name: "Batch regression",
    background: "#ffffff",
    layers: [
      {
        id: "4e2526a8-557b-4a66-bdd7-ac2d26109bc0",
        kind: "text",
        text: "{{number}}",
        x: 500,
        y: 500,
        width: 850,
        height: 400,
        rotation: 0,
        size: 180,
        color: "#244b37",
        font: "sans",
      },
    ],
  };
  const hashes = new Set<string>();
  for (let index = 0; index < 500; index++) {
    const output = await renderArtwork(
      artwork,
      configuration,
      { number: String(index + 1).padStart(3, "0") },
      150,
      3,
    );
    const hash = createHash("sha256").update(output.png).digest("hex");
    expect(hashes.has(hash), `duplicate output at row ${index + 1}`).toBe(
      false,
    );
    hashes.add(hash);
    if ([0, 249, 499].includes(index)) {
      const metadata = await sharp(output.png).metadata();
      expect(metadata.width).toBe(Math.ceil((86 / 25.4) * 150));
      expect(metadata.height).toBe(Math.ceil((56 / 25.4) * 150));
      expect(metadata.density).toBe(150);
      const pdf = await PDFDocument.load(output.pdf);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getTrimBox().width).toBeCloseTo(
        (80 / 25.4) * 72,
        4,
      );
      expect(pdf.getPage(0).getTrimBox().height).toBeCloseTo(
        (50 / 25.4) * 72,
        4,
      );
    }
  }
  expect(hashes.size).toBe(500);
}, 60000);
