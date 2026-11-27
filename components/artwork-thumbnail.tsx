import type { Artwork, Configuration } from "@/lib/catalog";
import { printFontFamily, layerTextGeometry } from "@/lib/print-text";
export function ArtworkThumbnail({
  artwork,
  configuration,
  variables = {},
}: {
  artwork: Artwork;
  configuration: Configuration;
  variables?: Record<string, string>;
}) {
  const ratio = configuration.height / configuration.width;
  return (
    <svg
      className="project-artwork"
      viewBox={`0 0 1000 ${1000 * ratio}`}
      role="img"
      aria-label={"Design preview: " + artwork.name}
    >
      <rect width="1000" height={1000 * ratio} fill={artwork.background} />
      {artwork.layers
        .filter((l) => !l.hidden)
        .map((l) => {
          const text = l.text.replace(
            /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g,
            (match, key) => variables[key] ?? match,
          );
          const geometry =
            l.kind === "text"
              ? layerTextGeometry(text, l, configuration)
              : null;
          return (
            <g
              key={l.id}
              transform={`translate(${l.x} ${l.y * ratio}) rotate(${l.rotation})`}
            >
              {l.kind === "image" ? (
                <image
                  href={l.image}
                  x={-l.width / 2}
                  y={(-l.height * ratio) / 2}
                  width={l.width}
                  height={l.height * ratio}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily={printFontFamily[l.font]}
                  fontWeight="700"
                  fill={l.color}
                  letterSpacing={geometry!.tracking}
                  fontSize={geometry!.size}
                  textLength={geometry!.width}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {text}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
