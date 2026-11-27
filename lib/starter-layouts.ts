import { initialArtwork } from "./initial-artwork";
import { fitArtwork } from "./studio-geometry";
import type { Configuration, Artwork } from "./catalog";
export function starterLayouts(c: Configuration) {
  const base = initialArtwork(c.productId);
  const variants: {
    id: string;
    name: string;
    product_id: string;
    artwork: Artwork;
  }[] = [
    {
      id: "builtin-bold",
      name: "Bold statement",
      product_id: c.productId,
      artwork: base,
    },
    {
      id: "builtin-classic",
      name: "Quiet classic",
      product_id: c.productId,
      artwork: {
        ...base,
        name: "Quiet classic",
        background: "#fffaf1",
        layers: base.layers.map((l, i) => ({
          ...l,
          font: i === 0 ? "serif" : "mono",
          color: "#191b17",
          text:
            c.productId === "race"
              ? i
                ? "YOUR RACE. YOUR PACE."
                : "{{number}}"
              : i
                ? "MADE WITH CARE."
                : "YOUR BRAND",
          size: i ? 55 : 115,
        })),
      },
    },
    {
      id: "builtin-colour",
      name: "Colour study",
      product_id: c.productId,
      artwork: {
        ...base,
        name: "Colour study",
        background: "#2f54b8",
        layers: base.layers.map((l, i) => ({
          ...l,
          color: "#fffaf1",
          text:
            c.productId === "race"
              ? i
                ? "GO YOUR OWN WAY"
                : "{{number}}"
              : i
                ? "BIG FEELINGS."
                : "SMALL THINGS",
          size: i ? 85 : 95,
        })),
      },
    },
  ];
  return variants.map((v) => ({ ...v, artwork: fitArtwork(v.artwork, c) }));
}
