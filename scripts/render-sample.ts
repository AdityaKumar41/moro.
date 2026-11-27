import { renderArtwork } from "../lib/render";
import { defaultConfig, type Artwork } from "../lib/catalog";
import { mkdirSync, writeFileSync } from "node:fs";
async function main() {
  const artwork: Artwork = {
    name: "Print validation",
    background: "#d8ed94",
    layers: [
      {
        id: crypto.randomUUID(),
        kind: "text",
        text: "MAKE GOOD",
        x: 500,
        y: 500,
        width: 850,
        height: 300,
        rotation: 0,
        size: 110,
        color: "#244b37",
        font: "sans",
      },
    ],
  };
  const output = await renderArtwork(artwork, defaultConfig());
  mkdirSync("tmp/pdfs", { recursive: true });
  writeFileSync("tmp/pdfs/print-validation.png", output.png);
  writeFileSync("tmp/pdfs/print-validation.pdf", output.pdf);
  console.log("Generated local print validation sample.");
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
