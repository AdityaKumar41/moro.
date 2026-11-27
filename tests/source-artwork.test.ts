import { it, expect } from "vitest";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import sharp from "sharp";
import { defaultConfig } from "../lib/catalog";
import {
  prepareSource,
  sourceArtwork,
  sealSource,
  verifyPreparedSource,
} from "../lib/source-artwork";
const c = { ...defaultConfig(), width: 60, height: 40 };
const path =
  "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf";
async function redPdf(pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++)
    doc.addPage([180, 120]).drawRectangle({
      x: 0,
      y: 0,
      width: 180,
      height: 120,
      color: rgb(1, 0, 0),
    });
  return Buffer.from(await doc.save());
}
it("automatically renders real PDF and PDF-compatible Illustrator content, not starter artwork", async () => {
  for (const ext of ["pdf", "ai"]) {
    const prepared = await prepareSource(await redPdf(), "logo." + ext, c);
    const { data } = await sharp(
      Buffer.from(prepared.image.split(",")[1], "base64"),
    )
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(245);
    expect(data[1]).toBeLessThan(10);
    expect(prepared.width).toBeCloseTo((60 / 25.4) * 300, -1);
    expect(sourceArtwork(prepared, c, "Source").layers).toHaveLength(1);
  }
}, 15000);
it("renders self-contained SVG and preserves real PNG pixels", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#0000ff"/></svg>',
  );
  const source = await prepareSource(svg, "logo.svg", c);
  const { data } = await sharp(
    Buffer.from(source.image.split(",")[1], "base64"),
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(data[2]).toBe(255);
  const png = await sharp({
    create: { width: 60, height: 40, channels: 4, background: "#00ff00" },
  })
    .png()
    .toBuffer();
  const result = await prepareSource(png, "logo.png", c);
  expect(result.width).toBe(60);
}, 15000);
it("rejects unsafe or unreadable artwork before checkout instead of accepting it for manual repair", async () => {
  for (const svg of [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>',
  ])
    await expect(prepareSource(Buffer.from(svg), "a.svg", c)).rejects.toThrow();
  await expect(
    prepareSource(Buffer.from("%!PS-Adobe-3.0"), "old.ai", c),
  ).rejects.toThrow("PDF Compatible");
  await expect(
    prepareSource(Buffer.from("not pdf"), "a.pdf", c),
  ).rejects.toThrow("valid PDF");
  await expect(prepareSource(await redPdf(2), "two.pdf", c)).rejects.toThrow(
    "one page",
  );
}, 15000);
it("binds preparation to the original path and exact visible source pixels with an unforgeable signature", async () => {
  const prepared = await prepareSource(await redPdf(), "a.pdf", c);
  const artwork = sourceArtwork(prepared, c, "Source");
  artwork.source = sealSource(path, prepared.image, "test-signing-key");
  expect(verifyPreparedSource(artwork, path, "test-signing-key")).toBe(true);
  expect(
    verifyPreparedSource(
      artwork,
      path.replace(".pdf", ".ai"),
      "test-signing-key",
    ),
  ).toBe(false);
  artwork.layers[0].hidden = true;
  expect(verifyPreparedSource(artwork, path, "test-signing-key")).toBe(false);
  artwork.layers[0].hidden = false;
  artwork.source.signature = "0".repeat(64);
  expect(verifyPreparedSource(artwork, path, "test-signing-key")).toBe(false);
}, 10000);

it("renders embedded SVG text with bundled fonts and keeps converted pixels through final print output", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="white"/><text x="20" y="100" font-family="Arimo" font-size="50">PRINT</text></svg>',
  );
  const prepared = await prepareSource(svg, "text.svg", c);
  const raw = await sharp(Buffer.from(prepared.image.split(",")[1], "base64"))
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(raw.filter((v) => v < 100).length).toBeGreaterThan(1000);
  const { renderArtwork } = await import("../lib/render");
  const output = await renderArtwork(sourceArtwork(prepared, c, "Source"), c);
  const meta = await sharp(output.png).metadata();
  expect(meta.density).toBe(300);
  expect(meta.width).toBe(Math.ceil((66 / 25.4) * 300));
  const red = await prepareSource(await redPdf(), "a.pdf", c);
  const printed = await renderArtwork(sourceArtwork(red, c, "Red"), c);
  const pixel = await sharp(printed.png)
    .extract({ left: 100, top: 100, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(pixel[0]).toBeGreaterThan(245);
  expect(pixel[1]).toBeLessThan(10);
}, 15000);

it("honours PDF trim boxes and page rotation instead of shrinking existing bleed into the printed design", async () => {
  for (const rotation of [0, 90, 180, 270]) {
    const doc = await PDFDocument.create(),
      page = doc.addPage([220, 140]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 220,
      height: 140,
      color: rgb(1, 0, 0),
    });
    page.drawRectangle({
      x: 10,
      y: 10,
      width: 200,
      height: 120,
      color: rgb(0, 0, 1),
    });
    page.setTrimBox(10, 10, 200, 120);
    page.setRotation(degrees(rotation));
    const prepared = await prepareSource(
      Buffer.from(await doc.save()),
      "trim.pdf",
      c,
    );
    const pixel = await sharp(
      Buffer.from(prepared.image.split(",")[1], "base64"),
    )
      .extract({ left: 2, top: 2, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(pixel[2]).toBeGreaterThan(245);
    expect(pixel[0]).toBeLessThan(10);
    expect(prepared.width / prepared.height).toBeCloseTo(
      rotation % 180 === 0 ? 200 / 120 : 120 / 200,
      1,
    );
  }
}, 15000);
it("accepts embedded raster base64 slashes while rejecting external SVG bases", async () => {
  const jpeg = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const encoded = jpeg.toString("base64");
  expect(encoded).toContain("//");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><image width="60" height="40" href="data:image/jpeg;base64,${encoded}"/></svg>`;
  await expect(
    prepareSource(Buffer.from(svg), "embedded.svg", c),
  ).resolves.toHaveProperty("image");
  await expect(
    prepareSource(
      Buffer.from(
        svg.replace(
          'width="60" height="40"',
          'width="60" height="40" xml:base="https://example.com/"',
        ),
      ),
      "external.svg",
      c,
    ),
  ).rejects.toThrow("self-contained");
}, 15000);
