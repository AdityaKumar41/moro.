import {
  type Artwork,
  type Configuration,
  type Layer,
  fitsPrintArea,
} from "./catalog";
export function fitLayer(layer: Layer, c: Configuration): Layer {
  const r = (layer.rotation * Math.PI) / 180;
  let low = 0,
    high = 1;
  const dimensions = (factor: number) => ({
    width: Math.max(20, layer.width * factor),
    height: Math.max(20, layer.height * factor),
  });
  const contained = (factor: number) => {
    const d = dimensions(factor),
      w = (d.width * c.width) / 1000,
      h = (d.height * c.height) / 1000;
    return (
      Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r)) <= c.width &&
      Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r)) <= c.height
    );
  };
  if (contained(1)) low = 1;
  else
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (contained(mid)) low = mid;
      else high = mid;
    }
  const next = { ...layer, ...dimensions(low) };
  const nw = (next.width * c.width) / 1000,
    nh = (next.height * c.height) / 1000;
  const hx =
      ((Math.abs(nw * Math.cos(r)) + Math.abs(nh * Math.sin(r))) / c.width) *
      500,
    hy =
      ((Math.abs(nw * Math.sin(r)) + Math.abs(nh * Math.cos(r))) / c.height) *
      500;
  next.x = Math.max(hx, Math.min(1000 - hx, next.x));
  next.y = Math.max(hy, Math.min(1000 - hy, next.y));
  if (!fitsPrintArea(next, c))
    throw Error("This element cannot fit the selected print area.");
  return next;
}
export function fitArtwork(a: Artwork, c: Configuration): Artwork {
  return { ...a, layers: a.layers.map((l) => fitLayer(l, c)) };
}
export type StudioSnapshot = {
  artwork: Artwork;
  configuration: Configuration;
  variableData: Record<string, string>[];
  uploadPath?: string;
  uploadName: string;
  designId: string;
  selected: string;
};
export function canvasFit(
  width: number,
  height: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
) {
  const fitted = Math.max(
    1,
    Math.min(frameWidth - 48, ((frameHeight - 48) * width) / height, 560),
  );
  return {
    width: (fitted * zoom) / 100,
    height: (((fitted * zoom) / 100) * height) / width,
  };
}
