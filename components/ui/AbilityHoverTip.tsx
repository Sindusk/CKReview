"use client";

// components/ui/AbilityHoverTip.tsx
//
// The ability hover tooltip shared by the Damage dialog, the roster's
// event lists and the Mitigation views. For FFXIV it is laid out like the
// in-game action tooltip (user, 2026-10-14: in-game's layout, our gold and
// black, translucent): icon, name and category, range and radius; a band
// of Cast / Recast / MP Cost; the description with the game's keyword
// colours; Acquired and Affinity. The data is XIVAPI's, fetched on the
// first hover and cached (lib/xivapi-tooltips.ts). Under it, set off by a
// rule, whatever the caller knows from the log (uses, median cast).
// `fallbackLines` are the caller's own stats (GCD, recast), shown only
// when XIVAPI has none: WoW, aliases, or a failed lookup.
//
// Boss casts have no description in the game data, so a tooltip with
// nothing to add beyond the name stays hidden; boss debuffs (statuses)
// do have one.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fetchXivTooltip, type XivSegment, type XivTooltip } from "@/lib/xivapi-tooltips";
import { getFFJobIcon } from "@/lib/ffl-job-data";

export const ABILITY_TIP_COLOR = "#9fd0ff";

const GOLD_LABEL = "var(--ck-gold-1)";
const RULE = "1px solid rgba(185, 134, 50, 0.22)";

const shell: CSSProperties = {
  position: "fixed", zIndex: 2100, pointerEvents: "none", boxSizing: "border-box",
  padding: "8px 10px 9px", borderRadius: 6,
  background: "linear-gradient(180deg, rgba(42, 32, 18, 0.86) 0%, rgba(14, 11, 8, 0.9) 100%)",
  backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
  border: "1px solid rgba(185, 134, 50, 0.55)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(236, 208, 142, 0.14)",
  fontSize: 12, lineHeight: 1.45, color: "var(--ck-text)", fontWeight: 400, whiteSpace: "normal", textAlign: "left",
};

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

function Description({ segs }: { segs: XivSegment[] }) {
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ck-text)" }}>
      {segs.map((s, i) => "br" in s ? <br key={i} /> : <span key={i} style={s.color ? { color: s.color } : undefined}>{s.text}</span>)}
    </div>
  );
}

/** Cast / Recast / MP Cost, each over a short gold gauge line. */
function StatBand({ tip }: { tip: NonNullable<XivTooltip> }) {
  const cols: [string, string][] = [];
  if (tip.castMs !== undefined) cols.push(["Cast", tip.castMs === 0 ? "Instant" : secs(tip.castMs)]);
  if (tip.recastMs !== undefined) cols.push(["Recast", secs(tip.recastMs)]);
  if (tip.mpCost) cols.push(["MP Cost", String(tip.mpCost)]);
  if (!cols.length) return null;
  return (
    <div style={{
      // Fixed slots, like in-game: with no MP cost the columns keep their
      // width and the band's right end stays empty.
      display: "grid", gridTemplateColumns: `repeat(${Math.max(3, cols.length)}, 1fr)`, margin: "7px -10px 7px", padding: "4px 10px 7px",
      background: "rgba(0, 0, 0, 0.3)", borderTop: RULE, borderBottom: RULE,
    }}>
      {cols.map(([label, value]) => (
        <div key={label} style={{ textAlign: "center", padding: "0 4px" }}>
          <div style={{ color: GOLD_LABEL, fontSize: 12 }}>{label}</div>
          <div className="ck-num" style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.15, color: "var(--ck-text)" }}>{value}</div>
          <div style={{ height: 3, marginTop: 3, borderRadius: 2, background: "linear-gradient(90deg, rgba(117, 80, 31, 0.9), rgba(226, 196, 127, 0.75))" }} />
        </div>
      ))}
    </div>
  );
}

export function AbilityHoverTip({ game, id, name, icon, lines = [], fallbackLines = [], footer, onClick, children, style }: {
  game: "ffxiv" | "wow";
  id?: number;           // FFLogs abilityGameID (statuses 1,000,000 + Status id)
  name: string;
  icon?: string;
  lines?: string[];         // what the log says (uses, median cast)
  fallbackLines?: string[]; // the caller's stats, when XIVAPI has none
  footer?: string;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [xiv, setXiv] = useState<XivTooltip | undefined>(undefined);
  const wantXiv = game === "ffxiv" && id !== undefined && id > 0;
  const width = wantXiv ? 350 : 280;
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(null);
    setAnchor(r);
    if (wantXiv && xiv === undefined) void fetchXivTooltip(id!, name).then(setXiv);
  };
  const hide = () => { setAnchor(null); setPos(null); };
  const loading = wantXiv && xiv === undefined;
  const ownStats = xiv ? [] : fallbackLines;
  const logLines = [...ownStats, ...lines];
  const visible = anchor && (logLines.length > 0 || footer || loading || xiv);

  // Placed after measuring, again whenever the content grows (the XIVAPI
  // data lands): below the name if it fits, else above, else beside it
  // with its top clamped on screen (Starry Muse's tooltip is taller than
  // either gap). Hidden until placed, so it never flashes off screen.
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!anchor || !el) return;
    const M = 8, GAP = 6, vw = window.innerWidth, vh = window.innerHeight;
    const h = el.offsetHeight;
    const clampLeft = (l: number) => Math.max(M, Math.min(l, vw - width - M));
    if (anchor.bottom + GAP + h <= vh - M) return setPos({ top: anchor.bottom + GAP, left: clampLeft(anchor.left) });
    if (anchor.top - GAP - h >= M) return setPos({ top: anchor.top - GAP - h, left: clampLeft(anchor.left) });
    const top = Math.max(M, Math.min(anchor.top + anchor.height / 2 - h / 2, vh - M - h));
    const right = anchor.right + GAP, leftSide = anchor.left - GAP - width;
    setPos({ top, left: right + width <= vw - M ? right : leftSide >= M ? leftSide : clampLeft(anchor.left) });
  }, [anchor, xiv, width, logLines.length]);
  const category = xiv?.kind === "action" ? xiv.category : xiv?.kind === "status" ? "Status" : undefined;
  const showRange = xiv?.kind === "action" && xiv.range !== undefined;

  return (
    <>
      <span ref={ref} tabIndex={0} style={{ cursor: onClick ? "pointer" : "help", outline: "none", ...style }}
        onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onClick={onClick && ((e) => { e.stopPropagation(); onClick(); })}>
        {children}
      </span>
      {visible && createPortal(
        <div ref={tipRef} role="tooltip" style={{
          ...shell, top: pos?.top ?? 0, left: pos?.left ?? 0, width,
          visibility: pos ? "visible" : "hidden", maxHeight: "calc(100vh - 16px)", overflow: "hidden",
        }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            {icon && (
              <img src={icon} alt="" width={40} height={40} style={{
                borderRadius: 5, flex: "0 0 auto", boxShadow: "0 0 0 1px rgba(185, 134, 50, 0.45), 0 2px 6px rgba(0, 0, 0, 0.6)",
              }} />
            )}
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-text)", lineHeight: 1.25 }}>{name}</div>
              {category && <div style={{ color: GOLD_LABEL, fontSize: 12 }}>{category}</div>}
            </div>
            {showRange && xiv?.kind === "action" && (
              <div className="ck-num" style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "auto auto", columnGap: 6, fontSize: 11.5, textAlign: "right", alignSelf: "flex-start" }}>
                <span style={{ color: "var(--ck-text-2)" }}>Range</span><span>{xiv.range}y</span>
                <span style={{ color: "var(--ck-text-2)" }}>Radius</span><span>{xiv.radius ?? 0}y</span>
              </div>
            )}
          </div>
          {xiv?.kind === "action" ? <StatBand tip={xiv} /> : xiv && <div style={{ height: 6 }} />}
          {xiv && <Description segs={xiv.description} />}
          {xiv?.kind === "action" && (xiv.level || xiv.affinity) && (
            <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", marginTop: 7, fontSize: 12 }}>
              {xiv.level && (
                <>
                  <span style={{ color: GOLD_LABEL }}>Acquired</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {xiv.job && <img src={getFFJobIcon(xiv.job)} alt="" width={16} height={16} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                    Lv. {xiv.level}
                  </span>
                </>
              )}
              {xiv.affinity && <><span style={{ color: GOLD_LABEL }}>Affinity</span><span>{xiv.affinity}</span></>}
            </div>
          )}
          {logLines.length > 0 && (
            <div style={{
              color: "var(--ck-text-2)", fontSize: 11.5,
              ...(xiv ? { marginTop: 7, paddingTop: 6, borderTop: RULE } : { marginTop: 4 }),
            }}>
              {logLines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          {loading && <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginTop: 4 }}>Loading tooltip…</div>}
          {footer && <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginTop: 4 }}>{footer}</div>}
        </div>,
        document.body,
      )}
    </>
  );
}
