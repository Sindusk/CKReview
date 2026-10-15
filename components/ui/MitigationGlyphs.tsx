// components/ui/MitigationGlyphs.tsx
//
// The Mitigation Analysis view's finding glyphs (lib/mitigation/findings.ts),
// drawn like the Damage dialog's theme glyphs (DamageGlyphs.tsx): one small
// SVG in a tinted disc, colour through currentColor. Used on the stat
// tiles, the timeline pins and the finding groups and rows.

import type { CSSProperties, ReactNode } from "react";
import { getFFAbilityIconUrl } from "@/lib/ability-icons";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { getPlayerClassIcon } from "@/lib/player-display";
import { AbilityHoverTip } from "./AbilityHoverTip";

export type FindingGlyphKind = "fail" | "tight" | "plan" | "unused" | "late" | "stacked" | "other";

export const FINDING_COLOR: Record<FindingGlyphKind, string> = {
  fail:    "#ff6b6b",
  tight:   "#f59e0b",
  plan:    "#2bb38a",
  unused:  "#4fd1c5",
  late:    "#c99bff",
  stacked: "#c99bff",
  other:   "#9da1a8",
};

const SHIELD = "M12 2.5l8 3.2v5.6c0 5-3.4 8.6-8 10.2-4.6-1.6-8-5.2-8-10.2V5.7z";

const PATHS: Record<FindingGlyphKind, ReactNode> = {
  fail: (
    <>
      <path d={SHIELD} fill="none" stroke="currentColor" strokeWidth={2.4} />
      <path d="M13 6.5l-2.5 5h3.5l-2.5 5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  tight: (
    <>
      <path d={SHIELD} fill="none" stroke="currentColor" strokeWidth={2.4} />
      <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    </>
  ),
  plan: <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />,
  unused: (
    <path d="M6 3h12M6 21h12M7.5 3v2.5c0 3 4.5 4.2 4.5 6.5s-4.5 3.5-4.5 6.5V21M16.5 3v2.5c0 3-4.5 4.2-4.5 6.5s4.5 3.5 4.5 6.5V21"
      fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
  ),
  late: (
    <>
      <circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth={2.4} />
      <path d="M12 9v4l3 2M9 2.5h6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  stacked: (
    <>
      <path d="M12 3l9 4.5-9 4.5-9-4.5z" fill="currentColor" />
      <path d="M3 12.5l9 4.5 9-4.5M3 17l9 4.5 9-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />
    </>
  ),
  other: (
    <>
      <path d="M12 3l10 18H2z" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M12 10v4.5M12 17.5v.5" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    </>
  ),
};

// ── Skill and job icons (user, 2026-10-14: icons over names) ─────────────

const iconOf = new Map(FFXIV_MITIGATION.catalog.map((e) => [e.key, getFFAbilityIconUrl(e.icon)]));
const entryOf = new Map(FFXIV_MITIGATION.catalog.map((e) => [e.key, e]));
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = "hidden"; };

/** Hover tooltip for a catalog mitigation: its name, `label` when that
 *  says more (e.g. who cast it), and the XIVAPI description. */
export function SkillTip({ entryKey, label, children, style }: { entryKey: string; label?: string; children: ReactNode; style?: CSSProperties }) {
  const entry = entryOf.get(entryKey);
  if (!entry) return <span title={label} style={style}>{children}</span>;
  return (
    <AbilityHoverTip game="ffxiv" id={entry.actionIds[0]} name={entry.name} icon={iconOf.get(entryKey)}
      lines={label && label !== entry.name ? [label] : []} style={style}>
      {children}
    </AbilityHoverTip>
  );
}

/** A mitigation's icon from the catalog (a blank square when it has none). */
export function SkillIcon({ entryKey, name, size = 18, style }: { entryKey: string; name: string; size?: number; style?: CSSProperties }) {
  const src = iconOf.get(entryKey);
  const box: CSSProperties = { width: size, height: size, borderRadius: 3, flex: "0 0 auto", display: "inline-block", verticalAlign: "middle", ...style };
  return (
    <SkillTip entryKey={entryKey} label={name} style={{ display: "inline-flex", flex: "0 0 auto", verticalAlign: "middle" }}>
      {src
        ? <img src={src} alt={name} width={size} height={size} style={box} onError={hideBroken} />
        : <span style={{ ...box, background: "var(--ck-line-2)" }} />}
    </SkillTip>
  );
}

/** A job's icon, the player's name in its tooltip. */
export function JobIcon({ job, player, size = 16 }: { job: string; player?: string; size?: number }) {
  return (
    <img src={getPlayerClassIcon("ffxiv", job)} alt={job} title={player ? `${player} (${job})` : job} width={size} height={size}
      style={{ flex: "0 0 auto", display: "inline-block", verticalAlign: "middle" }} onError={hideBroken} />
  );
}

/** Job icon, skill icon and the skill's name: who uses what, one glance. */
export function CdChip({ player, job, entryKey, name, showName = true }: {
  player: string; job: string; entryKey: string; name: string; showName?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, verticalAlign: "middle", whiteSpace: "nowrap" }}>
      <JobIcon job={job} player={player} size={17} />
      <SkillIcon entryKey={entryKey} name={`${name} (${player})`} size={17} />
      {showName && <span style={{ fontWeight: 600, color: "var(--ck-text)" }}>{name}</span>}
    </span>
  );
}

/** The finding's glyph in a tinted disc. */
export function FindingGlyph({ kind, size = 22, style, title }: { kind: FindingGlyphKind; size?: number; style?: CSSProperties; title?: string }) {
  const color = FINDING_COLOR[kind];
  return (
    <span aria-hidden={title ? undefined : true} title={title} style={{
      width: size, height: size, borderRadius: "50%", flex: "0 0 auto", display: "inline-grid", placeItems: "center",
      color, background: `color-mix(in srgb, ${color} 17%, transparent)`, ...style,
    }}>
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)}>{PATHS[kind]}</svg>
    </span>
  );
}
