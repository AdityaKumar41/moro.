import { printFont } from "./print-fonts";
import { layerTextGeometry } from "./print-text";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  validateArtwork,
  configSchema,
  type Artwork,
  type Configuration,
} from "./catalog";
export function substitute(text: string, row: Record<string, string>) {
  return text.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(row, key))
      throw Error(`CSV column ${key} is missing`);
    return row[key];
  });
}
export async function renderArtwork(
  artwork: Artwork,
  configuration: Configuration,
  row: Record<string, string> = {},
  dpi = 300,
  bleed = 3,
) {
  const a = validateArtwork(artwork, configuration),
    c = configSchema.parse(configuration);
  if (
    !Number.isFinite(dpi) ||
    dpi < 72 ||
    dpi > 300 ||
    !Number.isFinite(bleed) ||
    bleed < 0 ||
    bleed > 10
  )
    throw Error("Invalid print profile");
  const w = Math.ceil(((c.width + bleed * 2) / 25.4) * dpi),
    h = Math.ceil(((c.height + bleed * 2) / 25.4) * dpi);
  if (w * h > 15000000)
    throw Error("Artwork exceeds the rendering pixel budget");
  const b = (bleed / 25.4) * dpi;
  const contentW = w - 2 * b,
    contentH = h - 2 * b;
  const doc = await PDFDocument.create();
  const layers = a.layers
    .filter((l) => !l.hidden)
    .map((l) => {
      const text = l.kind === "text" ? substitute(l.text, row) : "";
      const x = (l.x / 1000) * contentW,
        y = (l.y / 1000) * contentH,
        lw = (l.width / 1000) * contentW,
        lh = (l.height / 1000) * contentH;
      if (l.kind === "image")
        return `<g transform="translate(${b + x} ${b + y}) rotate(${l.rotation})"><image href="${l.image}" x="${-lw / 2}" y="${-lh / 2}" width="${lw}" height="${lh}" preserveAspectRatio="xMidYMid meet"/></g>`;
      if (!text.trim()) return "";
      const font = printFont(l.font);
      if (
        Array.from(text).some(
          (char) => !font.hasGlyphForCodePoint(char.codePointAt(0)!),
        )
      )
        throw Error(
          "This print font does not contain one or more characters. Choose supported text or upload outlined artwork.",
        );
      const run = font.layout(text);
      const geometry = layerTextGeometry(text, l, c, contentW, contentH);
      const tracking = ((l.tracking ?? 0) / 1000) * font.unitsPerEm;
      const totalAdvance =
        run.advanceWidth + Math.max(0, run.glyphs.length - 1) * tracking;
      const scaleY = geometry.size / font.unitsPerEm;
      const scaleX = geometry.width / totalAdvance;
      if (
        !geometry.fits ||
        Math.min(geometry.size, scaleX * font.unitsPerEm) + 1e-6 <
          ((l.minFontPt ?? 6) / 72) * dpi
      )
        throw Error(
          "Text cannot fit legibly. Enlarge the text area or shorten its content.",
        );
      let penX = 0,
        penY = 0;
      const paths = run.glyphs
        .map((glyph, index) => {
          const position = run.positions[index];
          const path = `<path d="${glyph.path.toSVG()}" transform="translate(${penX + position.xOffset} ${penY + position.yOffset})"/>`;
          penX += position.xAdvance + tracking;
          penY += position.yAdvance;
          return path;
        })
        .join("");
      const centerY = (run.bbox.minY + run.bbox.maxY) / 2;
      return `<g fill="${l.color}" transform="translate(${b + x} ${b + y}) rotate(${l.rotation})"><g transform="scale(${scaleX} ${-scaleY}) translate(${-totalAdvance / 2} ${-centerY})">${paths}</g></g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${a.background}"/><defs><clipPath id="safe"><rect x="${b}" y="${b}" width="${contentW}" height="${contentH}"/></clipPath></defs><g clip-path="url(#safe)">${layers}</g></svg>`;
  const png = await sharp(Buffer.from(svg), { limitInputPixels: 15000000 })
    .png()
    .withMetadata({ density: dpi })
    .toBuffer();
  const page = doc.addPage([
    ((c.width + bleed * 2) / 25.4) * 72,
    ((c.height + bleed * 2) / 25.4) * 72,
  ]);
  const image = await doc.embedPng(png);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });
  page.setTrimBox(
    (bleed / 25.4) * 72,
    (bleed / 25.4) * 72,
    (c.width / 25.4) * 72,
    (c.height / 25.4) * 72,
  );
  doc.setTitle(a.name);
  doc.setProducer("Digital Heroes artwork engine");
  return { png, pdf: Buffer.from(await doc.save()), width: w, height: h };
}
