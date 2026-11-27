import { it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { renderArtwork, substitute } from "../lib/render";
import { defaultConfig, type Artwork } from "../lib/catalog";
const artwork: Artwork = {
  name: "Race proof",
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
it("generates matching 300 DPI PNG and PDF trim geometry with bleed", async () => {
  const c = { ...defaultConfig("race"), width: 100, height: 60 };
  const output = await renderArtwork(artwork, c, { number: "123" });
  const meta = await sharp(output.png).metadata();
  expect(meta.width).toBe(Math.ceil((106 / 25.4) * 300));
  expect(meta.height).toBe(Math.ceil((66 / 25.4) * 300));
  expect(meta.density).toBe(300);
  const pdf = await PDFDocument.load(output.pdf);
  const trim = pdf.getPage(0).getTrimBox();
  expect(trim.width).toBeCloseTo((100 / 25.4) * 72, 4);
  expect(trim.height).toBeCloseTo((60 / 25.4) * 72, 4);
  expect(pdf.getPageCount()).toBe(1);
});
it("fails a whole render when a required CSV column is missing", async () => {
  await expect(
    renderArtwork(artwork, defaultConfig("race"), { name: "runner" }),
  ).rejects.toThrow("CSV column number is missing");
});
it("does not evaluate markup or expressions in variable data", () => {
  expect(substitute("Runner {{name}}", { name: "<script>x</script>" })).toBe(
    "Runner <script>x</script>",
  );
});
it("rejects variable text too long to fit legibly", async () => {
  await expect(
    renderArtwork(artwork, defaultConfig("race"), { number: "W".repeat(300) }),
  ).rejects.toThrow("cannot fit legibly");
});

it("rejects inherited object properties as CSV columns", () => {
  expect(() => substitute("{{constructor}}", {})).toThrow(
    "CSV column constructor is missing",
  );
});

it("renders legible bundled glyphs for every print font without system text rendering", async () => {
  for (const font of ["sans", "serif", "mono"] as const) {
    const fixture: Artwork = {
      ...artwork,
      layers: [{ ...artwork.layers[0], text: "MADE REAL", font, size: 150 }],
    };
    const output = await renderArtwork(fixture, {
      ...defaultConfig(),
      width: 80,
      height: 80,
    });
    const { data, info } = await sharp(output.png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      right = 0,
      ink = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        if (data[i] + data[i + 1] + data[i + 2] < 400) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          ink++;
        }
      }
    expect(right - left).toBeGreaterThan(info.width * 0.6);
    expect(ink).toBeGreaterThan(10000);
  }
});

it("rejects glyphs absent from the bundled print font instead of producing empty boxes", async () => {
  await expect(
    renderArtwork(
      { ...artwork, layers: [{ ...artwork.layers[0], text: "漢字" }] },
      defaultConfig(),
    ),
  ).rejects.toThrow("does not contain");
});

it("enforces per-placeholder point-size limits in server rendering", async () => {
  const fixture = {
    ...artwork,
    layers: [
      { ...artwork.layers[0], text: "Hello", minFontPt: 72, maxFontPt: 72 },
    ],
  };
  await expect(renderArtwork(fixture, defaultConfig())).rejects.toThrow(
    "cannot fit legibly",
  );
});
it("applies tracking to the actual print glyphs", async () => {
  const inkWidth = async (tracking: number) => {
    const output = await renderArtwork(
      {
        ...artwork,
        layers: [
          {
            ...artwork.layers[0],
            text: "HELLO",
            tracking,
            minFontPt: 6,
            maxFontPt: 36,
          },
        ],
      },
      defaultConfig(),
    );
    const { data, info } = await sharp(output.png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      right = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        if (data[i] + data[i + 1] + data[i + 2] < 400) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    return right - left;
  };
  expect(await inkWidth(200)).toBeGreaterThan((await inkWidth(0)) * 1.15);
});

it("respects an order’s frozen bleed and resolution instead of current catalogue defaults", async () => {
  const c = defaultConfig();
  const fixture = {
    ...artwork,
    layers: [{ ...artwork.layers[0], text: "PROFILE" }],
  };
  const output = await renderArtwork(fixture, c, {}, 150, 2);
  const png = await sharp(output.png).metadata();
  expect(png.width).toBe(Math.ceil(((c.width + 4) / 25.4) * 150));
  expect(png.density).toBe(150);
  const pdf = await PDFDocument.load(output.pdf);
  expect(pdf.getPage(0).getTrimBox().x).toBeCloseTo((2 / 25.4) * 72, 4);
});
