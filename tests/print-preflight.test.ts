import { it, expect } from "vitest";
import { preflightPrintText } from "../lib/print-preflight";
import { initialArtwork } from "../lib/initial-artwork";
import { defaultConfig } from "../lib/catalog";
it("checks every personalised row before an order is accepted", () => {
  const artwork = initialArtwork("race");
  expect(() =>
    preflightPrintText(artwork, defaultConfig("race"), [
      { number: "101" },
      { number: "漢字" },
    ]),
  ).toThrow("does not contain");
  expect(() =>
    preflightPrintText(artwork, defaultConfig("race"), [
      { number: "101" },
      { number: "W".repeat(300) },
    ]),
  ).toThrow("cannot fit legibly");
  expect(() =>
    preflightPrintText(artwork, defaultConfig("race"), [
      { number: "101" },
      { number: "102" },
    ]),
  ).not.toThrow();
});
it("rejects a tiny print that cannot hold readable text", () => {
  expect(() =>
    preflightPrintText(initialArtwork(), {
      ...defaultConfig(),
      width: 10,
      height: 10,
    }),
  ).toThrow("cannot fit legibly");
});
