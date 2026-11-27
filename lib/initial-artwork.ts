import type { Artwork } from "./catalog";
export function initialArtwork(product = "labels"): Artwork {
  return {
    name: "My next great idea",
    background: product === "race" ? "#fff8ec" : "#f1c84d",
    layers: [
      {
        id: "4e2526a8-557b-4a66-bdd7-ac2d26109bc0",
        kind: "text",
        tracking: 0,
        minFontPt: 6,
        maxFontPt: 72,
        text: product === "race" ? "{{number}}" : "MAKE GOOD",
        x: 500,
        y: 400,
        width: 850,
        height: 200,
        rotation: 0,
        size: 110,
        color: "#244b37",
        font: "sans",
      },
      {
        id: "5e2526a8-557b-4a66-bdd7-ac2d26109bc0",
        kind: "text",
        tracking: 0,
        minFontPt: 6,
        maxFontPt: 72,
        text: product === "race" ? "RUN YOUR OWN RACE" : "THINGS HAPPEN.",
        x: 500,
        y: 620,
        width: 820,
        height: 170,
        rotation: 0,
        size: 90,
        color: "#244b37",
        font: "sans",
      },
    ],
  };
}
