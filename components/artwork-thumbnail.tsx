import type { Artwork, Configuration } from "@/lib/catalog";
import { printFontFamily, layerTextGeometry } from "@/lib/print-text";
export function ArtworkThumbnail({
  artwork,
  configuration,
}: {
  artwork: Artwork;
  configuration: Configuration;
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
        .map((l) => (
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
                letterSpacing={
                  layerTextGeometry(l.text, l, configuration).tracking
                }
                fontSize={layerTextGeometry(l.text, l, configuration).size}
                textLength={layerTextGeometry(l.text, l, configuration).width}
                lengthAdjust="spacingAndGlyphs"
              >
                {l.text}
              </text>
            )}
          </g>
        ))}
    </svg>
  );
}
