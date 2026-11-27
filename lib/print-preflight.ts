import { printFont } from "./print-fonts";
import { layerTextGeometry } from "./print-text";
import type { Artwork, Configuration } from "./catalog";
// Check every unique personalised text before accepting an order. The renderer
// repeats these checks when producing the definitive versioned proof.
export function preflightPrintText(
  artwork: Artwork,
  configuration: Configuration,
  rows: Record<string, string>[] = [],
) {
  const seen = new Set<string>();
  const width = (configuration.width / 25.4) * 72,
    height = (configuration.height / 25.4) * 72;
  for (const row of rows.length ? rows : [{}])
    for (const layer of artwork.layers) {
      if (layer.hidden || layer.kind !== "text") continue;
      const text = layer.text.replace(
        /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
        (_, key) => {
          if (!Object.prototype.hasOwnProperty.call(row, key))
            throw Error(`CSV column ${key} is missing`);
          return row[key];
        },
      );
      if (!text.trim()) continue;
      const key = JSON.stringify([
        layer.font,
        layer.size,
        layer.width,
        layer.height,
        layer.tracking,
        layer.minFontPt,
        layer.maxFontPt,
        text,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      const font = printFont(layer.font);
      if (
        Array.from(text).some(
          (char) => !font.hasGlyphForCodePoint(char.codePointAt(0)!),
        )
      )
        throw Error(
          "This print font does not contain one or more characters. Choose supported text or upload outlined artwork.",
        );
      const run = font.layout(text),
        geometry = layerTextGeometry(text, layer, configuration, width, height);
      const totalAdvance =
        run.advanceWidth +
        ((Math.max(0, run.glyphs.length - 1) * (layer.tracking ?? 0)) / 1000) *
          font.unitsPerEm;
      if (
        !geometry.fits ||
        Math.min(
          geometry.size,
          (geometry.width / totalAdvance) * font.unitsPerEm,
        ) +
          1e-6 <
          (layer.minFontPt ?? 6)
      )
        throw Error(
          "Text cannot fit legibly. Enlarge the text area or shorten its content.",
        );
    }
}
