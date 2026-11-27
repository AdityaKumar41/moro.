import type { Configuration, Layer } from "./catalog";
export const printFontFamily = {
  sans: "Arimo",
  serif: "Tinos",
  mono: "Cousine",
} as const;
type Fitting = {
  tracking?: number;
  minFontPt?: number;
  maxFontPt?: number;
  unitsPerPt?: number;
};
// Legacy proofs keep their exact geometry. New designs opt into uniform fitting,
// physical point-size limits and tracking shared by preview and print rendering.
export function textGeometry(
  text: string,
  requestedSize: number,
  width: number,
  height: number,
  options?: Fitting,
) {
  const enhanced =
    options &&
    (options.tracking !== undefined ||
      options.minFontPt !== undefined ||
      options.maxFontPt !== undefined);
  if (!enhanced)
    return {
      size: Math.min(requestedSize, height * 0.78),
      width: Math.min(width, text.length * requestedSize * 0.62),
      tracking: 0,
      fits: true,
    };
  const units = options.unitsPerPt ?? 1,
    trackingEm = (options.tracking ?? 0) / 1000;
  const advance = Math.max(
    0.01,
    text.length * 0.62 + Math.max(0, text.length - 1) * trackingEm,
  );
  const size = Math.min(
    Math.max(requestedSize, (options.minFontPt ?? 6) * units),
    (options.maxFontPt ?? 144) * units,
    height * 0.78,
    width / advance,
  );
  return {
    size,
    width: advance * size,
    tracking: trackingEm * size,
    fits: size + 1e-6 >= (options.minFontPt ?? 6) * units,
  };
}
export function layerTextGeometry(
  text: string,
  layer: Layer,
  configuration: Pick<Configuration, "width" | "height">,
  width = 1000,
  height = (width * configuration.height) / configuration.width,
) {
  return textGeometry(
    text,
    (layer.size / 1000) * width,
    (layer.width / 1000) * width,
    (layer.height / 1000) * height,
    {
      tracking: layer.tracking,
      minFontPt: layer.minFontPt,
      maxFontPt: layer.maxFontPt,
      unitsPerPt: width / ((configuration.width / 25.4) * 72),
    },
  );
}
