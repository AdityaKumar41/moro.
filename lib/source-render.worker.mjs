// Dedicated, time-bounded renderer. No uploaded script or PDF action is executed.
import { parentPort, workerData } from "node:worker_threads";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { PDFDocument } from "pdf-lib";
import { Resvg } from "@resvg/resvg-js";
import { DOMParser } from "@xmldom/xmldom";
import sharp from "sharp";
import { resolve } from "node:path";
const MAX_PIXELS = 15_000_000;
function dimensions(w, h, maxW, maxH) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
    throw Error("The artwork has invalid page dimensions.");
  const scale = Math.min(maxW / w, maxH / h);
  const width = Math.max(1, Math.round(w * scale)),
    height = Math.max(1, Math.round(h * scale));
  if (width * height > MAX_PIXELS) throw Error("Choose a smaller print size.");
  return { width, height };
}
function validateSvg(text) {
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))
    throw Error(
      "SVG references must be embedded; external entities and stylesheets are not supported.",
    );
  const doc = new DOMParser({
    onError: () => {
      throw Error("Invalid SVG.");
    },
  }).parseFromString(text, "image/svg+xml");
  if (
    doc.documentElement.localName !== "svg" ||
    doc.documentElement.namespaceURI !== "http://www.w3.org/2000/svg"
  )
    throw Error("Choose a valid SVG file.");
  const nodes = doc.getElementsByTagName("*");
  if (nodes.length > 20000)
    throw Error("This SVG is too complex. Export a flattened PDF or PNG.");
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes.item(i);
    if (
      [
        "script",
        "foreignObject",
        "iframe",
        "audio",
        "video",
        "animate",
        "animateTransform",
        "set",
      ].includes(n.localName)
    )
      throw Error(
        "Export a static SVG without scripts, animation or embedded HTML.",
      );
    for (let j = 0; j < n.attributes.length; j++) {
      const a = n.attributes.item(j),
        v = a.value.trim();
      if (a.name === "xmlns" || a.prefix === "xmlns") continue;
      const embeddedRaster =
        /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(v);
      if (
        /^on/i.test(a.localName) ||
        (!embeddedRaster &&
          /@import|@font-face|javascript:|file:|https?:|\/\//i.test(v))
      )
        throw Error(
          "SVG must be self-contained without scripts or external resources.",
        );
      if (
        (a.localName === "href" || a.localName === "src") &&
        !v.startsWith("#") &&
        !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)
      )
        throw Error("Embed SVG images as PNG/JPEG data before uploading.");
      for (const match of v.matchAll(/url\s*\(([^)]*)\)/gi))
        if (!/^['"]?#[\w:.-]+['"]?$/.test(match[1].trim()))
          throw Error("SVG resource links must refer to this file.");
    }
    if (
      n.localName === "style" &&
      /@|url\s*\((?!\s*['"]?#)/i.test(n.textContent)
    )
      throw Error("Embed all SVG styles and resources.");
  }
  return doc;
}
async function render() {
  const bytes = Buffer.from(workerData.bytes),
    { ext, maxWidth, maxHeight } = workerData;
  let png,
    format = ext;
  if (ext === "pdf" || ext === "ai") {
    if (bytes.subarray(0, 5).toString() !== "%PDF-")
      throw Error(
        ext === "ai"
          ? "Save the Illustrator file with Create PDF Compatible File enabled, or export it as PDF."
          : "Choose a valid PDF file.",
      );
    let metadata;
    try {
      metadata = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      throw Error(
        "This PDF could not be opened. Remove password protection and export it again.",
      );
    }
    if (metadata.getPageCount() !== 1)
      throw Error(
        "Upload one page or artboard per product. Export the intended page as a separate PDF.",
      );
    const pdfPage = metadata.getPage(0),
      crop = pdfPage.getCropBox(),
      trim = pdfPage.getTrimBox();
    const x = Math.max(crop.x, trim.x),
      y = Math.max(crop.y, trim.y),
      right = Math.min(crop.x + crop.width, trim.x + trim.width),
      top = Math.min(crop.y + crop.height, trim.y + trim.height);
    let rect = {
      x: x - crop.x,
      y: crop.height - (top - crop.y),
      width: right - x,
      height: top - y,
    };
    let cw = crop.width,
      ch = crop.height;
    const rotation = ((pdfPage.getRotation().angle % 360) + 360) % 360;
    if (rotation === 90) {
      rect = {
        x: ch - rect.y - rect.height,
        y: rect.x,
        width: rect.height,
        height: rect.width,
      };
      [cw, ch] = [ch, cw];
    } else if (rotation === 180)
      rect = {
        ...rect,
        x: cw - rect.x - rect.width,
        y: ch - rect.y - rect.height,
      };
    else if (rotation === 270) {
      rect = {
        x: rect.y,
        y: cw - rect.x - rect.width,
        width: rect.height,
        height: rect.width,
      };
      [cw, ch] = [ch, cw];
    } else if (rotation !== 0)
      throw Error("Export a PDF with a standard page rotation.");
    const target = dimensions(rect.width, rect.height, maxWidth, maxHeight),
      scale = Math.min(target.width / rect.width, target.height / rect.height);
    const fullWidth = Math.ceil(cw * scale),
      fullHeight = Math.ceil(ch * scale);
    if (fullWidth * fullHeight > MAX_PIXELS)
      throw Error(
        "The PDF page surrounding its trim area is too large. Export a tightly cropped PDF.",
      );
    const lib = await PDFiumLibrary.init();
    let doc;
    try {
      try {
        doc = await lib.loadDocument(new Uint8Array(bytes));
      } catch {
        throw Error(
          "This PDF could not be opened. Remove password protection and export it again.",
        );
      }
      if (doc.getPageCount() !== 1)
        throw Error(
          "Upload one page or artboard per product. Export the intended page as a separate PDF.",
        );
      const page = doc.getPage(0);
      try {
        const result = await page.render({
          width: fullWidth,
          height: fullHeight,
          transparent: true,
          renderFormFields: true,
          render: async ({ data, width, height }) =>
            sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
              .png()
              .toBuffer(),
        });
        const sx = result.width / cw,
          sy = result.height / ch;
        const left = Math.max(0, Math.ceil(rect.x * sx - 1e-5)),
          upper = Math.max(0, Math.ceil(rect.y * sy - 1e-5));
        const width = Math.min(
            result.width - left,
            Math.floor((rect.x + rect.width) * sx + 1e-5) - left,
          ),
          height = Math.min(
            result.height - upper,
            Math.floor((rect.y + rect.height) * sy + 1e-5) - upper,
          );
        if (width < 1 || height < 1) throw Error("The PDF trim area is empty.");
        png = await sharp(Buffer.from(result.data))
          .extract({ left, top: upper, width, height })
          .png()
          .toBuffer();
      } finally {
        page.close();
      }
    } finally {
      doc?.destroy();
      lib.destroy();
    }
  } else if (ext === "svg") {
    const text = bytes.toString("utf8");
    validateSvg(text);
    const font = {
      loadSystemFonts: false,
      fontFiles: ["arimo", "tinos", "cousine"].flatMap((n) =>
        [400, 700].map((w) =>
          resolve("assets/print-fonts/" + n + "-" + w + ".ttf"),
        ),
      ),
      defaultFontFamily: "Arimo",
      sansSerifFamily: "Arimo",
      serifFamily: "Tinos",
      monospaceFamily: "Cousine",
    };
    const original = new Resvg(text, { font });
    const d = dimensions(original.width, original.height, maxWidth, maxHeight);
    // Keep the viewport finite before resvg allocates its bitmap.
    const svg = new Resvg(text, {
      font,
      fitTo: { mode: "width", value: d.width },
    });
    if (svg.imagesToResolve().length)
      throw Error("Embed all SVG images before uploading.");
    png = svg.render().asPng();
  } else if (ext === "png") {
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      throw Error("Choose a valid PNG file.");
    const image = sharp(bytes, {
        limitInputPixels: MAX_PIXELS,
        failOn: "warning",
      }),
      meta = await image.metadata();
    if (!meta.width || !meta.height || (meta.pages ?? 1) !== 1)
      throw Error("Choose a single-frame PNG.");
    dimensions(meta.width, meta.height, maxWidth, maxHeight);
    png = await image
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } else throw Error("Accepted formats: PDF, PDF-compatible AI, SVG and PNG.");
  const metadata = await sharp(png, {
    limitInputPixels: MAX_PIXELS,
  }).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > MAX_PIXELS
  )
    throw Error("Artwork exceeds the print-image limit.");
  let encoded = png,
    mime = "png";
  // Preserve PNG/alpha when possible. Large flat source artwork uses the exact
  // same high-quality JPEG on the canvas, proof and final renderer (no hidden swap).
  if (encoded.length > 1_100_000) {
    mime = "jpeg";
    for (const quality of [96, 92, 88, 84, 80, 76]) {
      encoded = await sharp(png)
        .flatten({ background: "#ffffff" })
        .jpeg({ quality, chromaSubsampling: "4:4:4" })
        .toBuffer();
      if (encoded.length <= 1_100_000) break;
    }
  }
  if (encoded.length > 1_100_000)
    throw Error(
      "This artwork is too detailed for this print size. Export an optimized PDF/PNG and try again.",
    );
  return {
    image: "data:image/" + mime + ";base64," + encoded.toString("base64"),
    width: metadata.width,
    height: metadata.height,
    format,
  };
}
render()
  .then((value) => parentPort.postMessage({ ok: true, value }))
  .catch((e) =>
    parentPort.postMessage({
      ok: false,
      error: e instanceof Error ? e.message : "Artwork could not be prepared.",
    }),
  );
