"use client";
import { useEffect, useState, type InputHTMLAttributes } from "react";
// Let people type intermediate values such as an empty field or a leading 1
// without replacing their input with the minimum on every keystroke.
export function NumberField({
  value,
  onChange,
  onBlur,
  min,
  max,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { value: number }) {
  const [draft, setDraft] = useState(String(value)),
    [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  return (
    <input
      {...props}
      type="number"
      min={min}
      max={max}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        if (
          raw !== "" &&
          Number.isFinite(n) &&
          n >= Number(min ?? -Infinity) &&
          n <= Number(max ?? Infinity)
        )
          onChange?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const n = draft.trim() === "" ? value : Number(draft);
        const clamped = Math.max(
          Number(min ?? -Infinity),
          Math.min(Number(max ?? Infinity), Number.isFinite(n) ? n : value),
        );
        e.currentTarget.value = String(clamped);
        if (clamped !== value) onChange?.(e);
        onBlur?.(e);
      }}
    />
  );
}
