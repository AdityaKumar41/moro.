import { it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductionFiles } from "../components/production-files";
vi.mock("@/lib/print-text", async () => import("../lib/print-text"));
import { ArtworkThumbnail } from "../components/artwork-thumbnail";
import { defaultConfig } from "../lib/catalog";
import { initialArtwork } from "../lib/initial-artwork";
it("keeps large production lists bounded and excludes artifacts from superseded proofs", () => {
  const artifacts = Array.from({ length: 500 }, (_, i) => ({
    id: "current-" + i,
    proof_id: "approved",
    kind: "pdf",
    row_number: i + 1,
  }));
  artifacts.push({
    id: "superseded",
    proof_id: "old",
    kind: "pdf",
    row_number: 1,
  });
  const html = renderToStaticMarkup(
    createElement(ProductionFiles, {
      orderId: "order",
      proofId: "approved",
      artifacts,
    }),
  );
  expect(html).toContain("500");
  expect(html).toContain("Page 1 of 50");
  expect(html.match(/href=/g)).toHaveLength(10);
  expect(html).not.toContain("artifact=superseded");
  expect(html).not.toContain("artifact=current-10");
});
it("shows actual personalized text in order previews and omits hidden content", () => {
  const artwork = initialArtwork("race");
  artwork.layers[0].text = "{{number}}";
  artwork.layers[1].text = "HIDDEN";
  artwork.layers[1].hidden = true;
  const html = renderToStaticMarkup(
    createElement(ArtworkThumbnail, {
      artwork,
      configuration: defaultConfig("race"),
      variables: { number: "025" },
    }),
  );
  expect(html).toContain(">025</text>");
  expect(html).not.toContain("HIDDEN");
  expect(html).not.toContain("{{number}}");
});
