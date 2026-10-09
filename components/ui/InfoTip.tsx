"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Panel } from "./Panel";

/*
  Circled "i" (or red "!" for `tone="alert"`) with an instant hover/focus tooltip framed like the app's
  panels (gilt border and corner ornaments, no diamond). The native
  `title` tooltip waits ~1s and can't be styled, hence this.

  The tooltip is portaled to <body> with fixed positioning, because panel
  bodies clip their overflow. It opens below the icon, right-aligned to it,
  since the icons sit at the right end of panel headers.
*/
export function InfoTip({
  content,
  label,
  tone = "default",
}: {
  content: ReactNode;
  /** Plain-text version of `content` for screen readers. */
  label:   string;
  tone?:   "default" | "alert";
}) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  function show() {
    const r = iconRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }

  const hide = () => setPos(null);
  const color = tone === "alert" ? "#f87171" : "var(--ck-text-2)";

  return (
    <>
      <span
        ref={iconRef}
        tabIndex={0}
        role="img"
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          "18px",
          height:         "18px",
          borderRadius:   "50%",
          border:         `1px solid ${tone === "alert" ? "#f87171" : "var(--ck-text-3)"}`,
          background:     tone === "alert" ? "rgba(248,113,113,0.12)" : undefined,
          color,
          fontSize:       "11px",
          fontWeight:     700,
          fontStyle:      tone === "alert" ? "normal" : "italic",
          fontFamily:     "Georgia, serif",
          cursor:         "help",
          flexShrink:     0,
          outline:        "none",
        }}
      >
        {tone === "alert" ? "!" : "i"}
      </span>

      {pos && createPortal(
        <div
          role="tooltip"
          style={{
            position:      "fixed",
            top:           pos.top,
            right:         pos.right,
            zIndex:        2000,
            maxWidth:      "280px",
            pointerEvents: "none",
          }}
        >
          <Panel diamond={false} bodyStyle={{ padding: "8px 12px", fontSize: "12px", lineHeight: 1.5, color: "var(--ck-text)" }}>
            {content}
          </Panel>
        </div>,
        document.body,
      )}
    </>
  );
}
