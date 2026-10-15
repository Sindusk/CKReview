"use client";

// components/ui/ResizeHandle.tsx
//
// A drag handle filling the gap between two panels. "col" sits between
// columns and drags sideways, "row" between stacked panels and drags up and
// down. Reports the pixels moved since the last move event; double-click
// resets. A thin gold line shows on hover and while dragging.

import { useRef, useState } from "react";

export function ResizeHandle({ orientation, onDrag, onReset, size = 14 }: {
  orientation: "col" | "row";
  onDrag:      (deltaPx: number) => void;
  onReset?:    () => void;
  size?:       number;
}) {
  const last = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState(false);
  const col = orientation === "col";
  const lit = active || hover;
  return (
    <div
      role="separator"
      aria-orientation={col ? "vertical" : "horizontal"}
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = col ? e.clientX : e.clientY;
        setActive(true);
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const now = col ? e.clientX : e.clientY;
        const d = now - last.current;
        if (d !== 0) { last.current = now; onDrag(d); }
      }}
      onPointerUp={() => { last.current = null; setActive(false); }}
      onPointerCancel={() => { last.current = null; setActive(false); }}
      onDoubleClick={onReset}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", flex: "0 0 auto", touchAction: "none", userSelect: "none",
        cursor: col ? "col-resize" : "row-resize",
        ...(col ? { width: size, height: "100%" } : { height: size, width: "100%" }),
      }}
    >
      <span style={{
        position: "absolute", background: "var(--ck-text-gold)", opacity: lit ? 0.6 : 0, transition: "opacity 0.12s",
        ...(col ? { left: size / 2 - 1, width: 2, top: 8, bottom: 8 } : { top: size / 2 - 1, height: 2, left: 8, right: 8 }),
      }} />
    </div>
  );
}
