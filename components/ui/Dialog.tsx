"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Panel, PanelHeader } from "./Panel";

/*
  Modal shell shared by every dialog: dimmed backdrop, a gilt Panel frame,
  a Cinzel title bar and an optional footer row for the action buttons.
  Callers keep their own `if (!open) return null` and their own state; this
  only owns the chrome.

  Backdrop clicks close the dialog only when `onBackdropClick` is passed —
  form dialogs deliberately leave it out so a stray click can't discard
  what was typed.

  `resizeKey` makes the dialog resizable (user, 2026-10-15: the Damage,
  Mitigation and Strategy dialogs sat oddly sized, especially on 4k
  monitors): drag the right edge, the bottom edge or the corner. The size
  is kept per key in this browser (localStorage, a convenience only) and a
  double-click on a handle goes back to the caller's size. The dialog stays
  centred, so an edge moves by half the drag on each side.
*/

const MIN_W = 420;
const MIN_H = 280;
const storageKey = (key: string) => `ck-dialog-size:${key}`;

function loadSize(key: string): { w: number; h: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(key)) ?? "null");
    return raw && typeof raw.w === "number" && typeof raw.h === "number" ? raw : null;
  } catch {
    return null;
  }
}

export function Dialog({
  title,
  subtitle,
  width,
  height,
  maxHeight = "90vh",
  zIndex = 1000,
  onBackdropClick,
  onClose,
  headerActions,
  footer,
  bodyStyle,
  resizeKey,
  children,
}: {
  title:            ReactNode;
  subtitle?:        ReactNode;
  /** Any CSS width; it is capped to the viewport. */
  width:            string;
  /** A fixed height, so the dialog doesn't resize as its content changes. */
  height?:          string;
  maxHeight?:       string;
  zIndex?:          number;
  onBackdropClick?: () => void;
  /** Renders a ✕ button in the title bar. */
  onClose?:         () => void;
  headerActions?:   ReactNode;
  footer?:          ReactNode;
  bodyStyle?:       CSSProperties;
  /** Makes the dialog resizable, its size remembered under this key. */
  resizeKey?:       string;
  children?:        ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ x: number; y: number; w: number; h: number; dx: boolean; dy: boolean } | null>(null);

  useEffect(() => {
    if (resizeKey) setSize(loadSize(resizeKey));
  }, [resizeKey]);

  function save(next: { w: number; h: number } | null) {
    setSize(next);
    if (!resizeKey) return;
    try {
      if (next) localStorage.setItem(storageKey(resizeKey), JSON.stringify(next));
      else localStorage.removeItem(storageKey(resizeKey));
    } catch { /* storage blocked: the size lasts this visit */ }
  }

  function startDrag(e: ReactPointerEvent, dx: boolean, dy: boolean) {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, dx, dy };
  }
  function moveDrag(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    // Centred: the box grows on both sides, so twice the pointer's travel.
    const w = d.dx ? d.w + 2 * (e.clientX - d.x) : d.w;
    const h = d.dy ? d.h + 2 * (e.clientY - d.y) : d.h;
    // Inside the overlay's 24px padding.
    setSize({
      w: Math.round(Math.max(MIN_W, Math.min(window.innerWidth - 48, w))),
      h: Math.round(Math.max(MIN_H, Math.min(window.innerHeight - 48, h))),
    });
  }
  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    if (size) save(size);
  }

  const handle = (dx: boolean, dy: boolean, style: CSSProperties, cursor: string) => (
    <div
      aria-hidden="true"
      title="Drag to resize · double-click to reset"
      onPointerDown={(e) => startDrag(e, dx, dy)}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => save(null)}
      style={{ position: "absolute", zIndex: 5, touchAction: "none", cursor, ...style }}
    />
  );

  const sized = resizeKey && size;
  return (
    <div className="ck-overlay" style={{ zIndex }} onClick={onBackdropClick}>
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", display: "flex", flexDirection: "column", minHeight: 0,
          ...(sized
            ? { width: size.w, height: size.h, maxWidth: "100%", maxHeight: "100%" }
            : { width, maxWidth: "100%", height, maxHeight }),
        }}
      >
        <Panel style={{ flex: "1 1 auto", minHeight: 0 }}>
          <PanelHeader title={title} subtitle={subtitle} shrinkTitle>
            {headerActions}
            {onClose && (
              <button className="ck-btn ck-btn--sm" onClick={onClose} aria-label="Close" title="Close">
                ✕
              </button>
            )}
          </PanelHeader>

          {children !== undefined && (
            <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "16px 18px", ...bodyStyle }}>
              {children}
            </div>
          )}

          {footer && <div className="ck-dialog-footer">{footer}</div>}
        </Panel>
        {resizeKey && (
          <>
            {handle(true, false, { top: 12, bottom: 12, right: -5, width: 10 }, "ew-resize")}
            {handle(false, true, { left: 12, right: 12, bottom: -5, height: 10 }, "ns-resize")}
            {handle(true, true, { right: -6, bottom: -6, width: 18, height: 18 }, "nwse-resize")}
            {/* A visible grip in the corner. */}
            <svg aria-hidden="true" width={12} height={12} viewBox="0 0 12 12"
              style={{ position: "absolute", right: 4, bottom: 4, pointerEvents: "none", opacity: 0.55 }}>
              <path d="M11 4 L4 11 M11 8 L8 11" stroke="var(--ck-text-gold)" strokeWidth={1.3} strokeLinecap="round" />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

/** Uppercase field label + control, the standard dialog form row. */
export function Field({
  label,
  children,
  style,
}: {
  label:    ReactNode;
  children: ReactNode;
  style?:   CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "14px", ...style }}>
      <label className="ck-label">{label}</label>
      {children}
    </div>
  );
}
