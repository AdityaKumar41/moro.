"use client";
import { useEffect, useRef, useState } from "react";
import type { Layer } from "@/lib/catalog";
export function InlineTextEditor({
  layer,
  onCommit,
  onCancel,
}: {
  layer: Layer;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(layer.text);
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  function finish(cancel = false) {
    if (finished.current) return;
    finished.current = true;
    cancel ? onCancel() : onCommit(text);
  }
  return (
    <input
      ref={ref}
      className="studio-inline-text"
      aria-label="Edit text on canvas"
      value={text}
      maxLength={300}
      style={{
        left: `${layer.x / 10}%`,
        top: `${layer.y / 10}%`,
        width: `${layer.width / 10}%`,
        height: `${Math.max(layer.height / 10, 8)}%`,
        transform: `translate(-50%,-50%) rotate(${layer.rotation}deg)`,
        color: layer.color,
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => finish()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Enter") {
          e.preventDefault();
          finish();
        }
      }}
    />
  );
}
