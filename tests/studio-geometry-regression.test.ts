import { it, expect } from "vitest";
import {
  layerSchema,
  validateArtwork,
  fitsPrintArea,
  defaultConfig,
} from "../lib/catalog";
import { initialArtwork } from "../lib/initial-artwork";
it("permits a rotated element that fits the physical rectangular print area", () => {
  const layer = {
    ...initialArtwork().layers[0],
    x: 300,
    y: 500,
    width: 300,
    height: 900,
    rotation: 90,
  };
  const configuration = { ...defaultConfig(), width: 180, height: 100 };
  expect(fitsPrintArea(layer, configuration)).toBe(true);
  expect(layerSchema.safeParse(layer).success).toBe(true);
  expect(() =>
    validateArtwork({ ...initialArtwork(), layers: [layer] }, configuration),
  ).not.toThrow();
});

import { fitArtwork, canvasFit } from "../lib/studio-geometry";
it("preserves project text while fitting a new orientation inside physical bounds", () => {
  const artwork = initialArtwork();
  artwork.name = "My custom project";
  artwork.layers[0] = { ...artwork.layers[0], rotation: 25 };
  for (const configuration of [
    { ...defaultConfig(), width: 300, height: 10 },
    { ...defaultConfig(), width: 10, height: 300 },
  ]) {
    const fitted = fitArtwork(artwork, configuration);
    expect(fitted.name).toBe("My custom project");
    expect(fitted.layers[0].text).toBe(artwork.layers[0].text);
    expect(() => validateArtwork(fitted, configuration)).not.toThrow();
  }
});
it("actually zooms the fitted canvas while preserving its print aspect ratio", () => {
  const fit = canvasFit(100, 180, 290, 350, 100),
    zoomed = canvasFit(100, 180, 290, 350, 125);
  expect(zoomed.width / fit.width).toBeCloseTo(1.25);
  expect(zoomed.width / zoomed.height).toBeCloseTo(100 / 180);
});
