"use client";
import { useLayoutEffect, useRef, useState } from "react";
export function StudioContextMenu({
  x,
  y,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  actions: {
    label: string;
    shortcut?: string;
    disabled?: boolean;
    run: () => void;
  }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState({ x, y });
  useLayoutEffect(() => {
    const el = ref.current!;
    const bounds = el.getBoundingClientRect();
    setPoint({
      x: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)),
    });
    el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const close = () => onClose();
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [x, y, onClose]);
  return (
    <div
      className="studio-context-shade"
      onPointerDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={ref}
        className="studio-context-menu"
        role="menu"
        aria-label="Element actions"
        style={{ left: point.x, top: point.y }}
        onPointerDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          const buttons = Array.from(
            ref.current!.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const i = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            buttons[
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? buttons.length - 1
                  : (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                    buttons.length
            ]?.focus();
          }
          if (e.key === "Tab") onClose();
        }}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            role="menuitem"
            disabled={a.disabled}
            onClick={() => {
              a.run();
              onClose();
            }}
          >
            <span>{a.label}</span>
            {a.shortcut && <kbd>{a.shortcut}</kbd>}
          </button>
        ))}
      </div>
    </div>
  );
}
