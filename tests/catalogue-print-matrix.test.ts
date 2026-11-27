import { it, expect } from "vitest";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { divisions, defaultConfig, validateArtwork } from "../lib/catalog";
import { starterLayouts } from "../lib/starter-layouts";
import { preflightPrintText } from "../lib/print-preflight";
import { renderArtwork } from "../lib/render";
import { price } from "../lib/pricing";
it.each(divisions)(
  "$id: all starter layouts quote, preflight and render in both orientations",
  async (product) => {
    for (const portrait of [false, true]) {
      const base = defaultConfig(product.id),
        c = portrait
          ? { ...base, width: base.height, height: base.width }
          : base;
      const quoted = price(c);
      expect(quoted.total).toBe(quoted.net + quoted.tax);
      expect(quoted.total).toBeGreaterThan(0);
      for (const template of starterLayouts(c)) {
        validateArtwork(template.artwork, c);
        preflightPrintText(template.artwork, c, [{ number: "101" }]);
        const rendered = await renderArtwork(template.artwork, c, {
          number: "101",
        });
        const metadata = await sharp(rendered.png).metadata();
        expect(metadata.density).toBe(300);
        expect(metadata.width).toBe(Math.ceil(((c.width + 6) / 25.4) * 300));
        expect(metadata.height).toBe(Math.ceil(((c.height + 6) / 25.4) * 300));
        const page = (await PDFDocument.load(rendered.pdf)).getPage(0);
        expect(page.getTrimBox().width).toBeCloseTo((c.width / 25.4) * 72, 4);
        expect(page.getTrimBox().height).toBeCloseTo((c.height / 25.4) * 72, 4);
      }
    }
  },
  20000,
);
