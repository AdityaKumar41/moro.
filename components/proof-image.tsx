"use client";
import { useState } from "react";
export function ProofImage({
  src,
  alt,
  width,
  height,
  onReady,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  onReady: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  return (
    <div
      className="proof-image-stage"
      style={{ aspectRatio: `${width + 6}/${height + 6}` }}
      aria-busy={!loaded && !failed}
    >
      {!loaded && !failed && (
        <div
          className="skeleton-block proof-image-skeleton"
          role="status"
          aria-label="Loading artwork proof"
        >
          <span className="sr-only">Loading artwork proof…</span>
        </div>
      )}
      {failed ? (
        <div className="proof-image-error" role="alert">
          <p>Your proof could not be loaded.</p>
          <button
            className="button outline"
            onClick={() => {
              setFailed(false);
              setLoaded(false);
              setRetry((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <img
          key={retry}
          className="proof-image"
          alt={alt}
          src={src + (retry ? "&retry=" + retry : "")}
          style={{ visibility: loaded ? "visible" : "hidden" }}
          onLoad={() => {
            setLoaded(true);
            onReady();
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
