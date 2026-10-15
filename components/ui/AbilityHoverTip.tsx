"use client";

// components/ui/AbilityHoverTip.tsx
//
// The ability hover tooltip shared by the Damage dialog, the roster's
// event lists and the Mitigation views: icon and name, any lines the
// caller knows (GCD, cooldown, uses), and for FFXIV the in-game
// description from XIVAPI, fetched on the first hover and cached
// (lib/xivapi-tooltips.ts). Boss casts have no description in the game
// data, so a tooltip with nothing to add beyond the name stays hidden;
// boss debuffs (statuses) do have one.

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fetchXivTooltip, type XivTooltip } from "@/lib/xivapi-tooltips";

export const ABILITY_TIP_COLOR = "#9fd0ff";

export function AbilityHoverTip({ game, id, name, icon, lines = [], footer, onClick, children, style }: {
  game: "ffxiv" | "wow";
  id?: number;           // FFLogs abilityGameID (statuses 1,000,000 + Status id)
  name: string;
  icon?: string;
  lines?: string[];
  footer?: string;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [xiv, setXiv] = useState<XivTooltip | undefined>(undefined);
  const wantXiv = game === "ffxiv" && id !== undefined && id > 0;
  const width = wantXiv ? 340 : 280;
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 10));
    // Below the name, or above it in the lower part of the screen, where a
    // long description would run off the bottom.
    setPos(r.bottom > window.innerHeight * 0.55 ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
    if (wantXiv && xiv === undefined) void fetchXivTooltip(id!, name).then(setXiv);
  };
  const loading = wantXiv && xiv === undefined;
  const visible = pos && (lines.length > 0 || footer || loading || xiv);

  return (
    <>
      <span ref={ref} tabIndex={0} style={{ cursor: onClick ? "pointer" : "help", outline: "none", ...style }}
        onMouseEnter={show} onMouseLeave={() => setPos(null)} onFocus={show} onBlur={() => setPos(null)}
        onClick={onClick && ((e) => { e.stopPropagation(); onClick(); })}>
        {children}
      </span>
      {visible && createPortal(
        <div role="tooltip" style={{
          position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, zIndex: 2100, width, pointerEvents: "none",
          background: "#0d1013", border: "1px solid var(--ck-frame-soft)", borderRadius: 3, padding: "8px 10px",
          fontSize: 12, lineHeight: 1.5, color: "var(--ck-text)", boxShadow: "0 6px 20px rgba(0,0,0,0.55)",
          fontWeight: 400, whiteSpace: "normal", textAlign: "left",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            {icon && <img src={icon} alt="" width={30} height={30} style={{ borderRadius: 3, flex: "0 0 auto" }} />}
            <span style={{ color: ABILITY_TIP_COLOR, fontWeight: 700, fontSize: 13 }}>{name}</span>
          </div>
          {lines.map((l, i) => <div key={i} style={{ color: i === 0 ? "var(--ck-text)" : "var(--ck-text-2)" }}>{l}</div>)}
          {xiv && (
            <div style={{
              whiteSpace: "pre-line", color: "var(--ck-text-2)",
              ...(lines.length ? { marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--ck-frame-soft)" } : {}),
            }}>
              {xiv.description}
            </div>
          )}
          {loading && <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginTop: 4 }}>Loading description…</div>}
          {footer && <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginTop: 4 }}>{footer}</div>}
        </div>,
        document.body,
      )}
    </>
  );
}
