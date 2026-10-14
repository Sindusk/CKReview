"use client";

// components/DamageAbilities.tsx
//
// Ability names in the Damage dialog's finding text. Findings name
// abilities in plain text ("No GCD for 1.3s after Kasha"), so the names are
// matched against the abilities this player logged in the pull(s) (casts,
// buffs, hits, heals), longest first, and drawn with their icon in the
// ability colour. Only the player's own abilities can match, so a boss's
// attack named in a cause isn't decorated. Names under 3 characters are
// left out (Dia and Bio are 3); the match is case-sensitive, so a name
// doesn't hit an ordinary word.
//
// Hovering a name or icon shows what the app knows about it without a
// fetch: GCD or off-GCD, recast / cooldown and charges (the game layer's
// DamageGame.action), the player's median cast time and how often they
// used it. For WoW, clicking opens its Wowhead page in a new tab; FFXIV
// names don't link out.

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Pull } from "@/types/Pull";
import type { DamageGame } from "@/lib/damage/types";
import { FFXIV_DAMAGE } from "@/lib/damage/ffxiv/game";
import { WOW_DAMAGE } from "@/lib/damage/wow/game";

// Ability names: a pale arcane blue, apart from the cream text, the loss
// reds and the raid-buff gold; it reads as a link, which it is.
export const ABILITY_COLOR = "#9fd0ff";

type AbilityInfo = {
  name:      string;
  icon?:     string;
  id?:       number;
  status:    boolean;     // seen only as a buff / debuff, never cast
  casts:     number;
  applied:   number;      // buff applications, for a status
  castMsMedian?: number;  // median hard-cast time over the player's casts
  aliasOf?:  string;      // a name the log never records (Darkside)
};
export type AbilityIcons = {
  icons: Map<string, string>;
  info:  Map<string, AbilityInfo>;
  re:    RegExp | null;
  game:  "ffxiv" | "wow";
  pulls: number;
};

// Names findings use that the log never records, shown with the icon of
// the ability that keeps them up: Darkside is a gauge timer, not a status.
const ICON_ALIASES: [string, string[]][] = [
  ["Darkside", ["Edge of Shadow", "Flood of Shadow"]],
];
const AUTO_ATTACK = /^(attack|melee|auto shot|shoot)$/i;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

export function abilityIconsOf(pulls: Pull[], player: string): AbilityIcons {
  const info = new Map<string, AbilityInfo>();
  const castTimes = new Map<string, number[]>();
  let played = 0;
  const entry = (name: string, id: number, icon: string | undefined, status: boolean) => {
    let e = info.get(name);
    if (!e) { e = { name, id, icon, status, casts: 0, applied: 0 }; info.set(name, e); }
    if (!e.icon && icon) e.icon = icon;
    // A cast's id beats a buff's: the cast is the action to look up.
    if (e.status && !status) { e.status = false; e.id = id; }
    return e;
  };
  for (const p of pulls) {
    const pl = p.players.find((x) => x.name === player);
    if (!pl) continue;
    played++;
    for (const c of pl.casts) {
      if (c.fake || !c.abilityName) continue;
      entry(c.abilityName, c.abilityId, c.abilityIcon, false).casts++;
    }
    for (const b of pl.beginCasts ?? []) {
      if (!b.abilityName || !(b.durationMs && b.durationMs > 0)) continue;
      castTimes.set(b.abilityName, [...(castTimes.get(b.abilityName) ?? []), b.durationMs]);
    }
    for (const b of pl.buffs ?? []) {
      if (!b.abilityName) continue;
      const e = entry(b.abilityName, b.abilityId, b.abilityIcon, true);
      if (b.buffStatus === "applied") e.applied++;
    }
    for (const e of [...pl.damageDone, ...pl.healing]) {
      if (e.abilityName && !e.pet) entry(e.abilityName, e.abilityId, e.abilityIcon, true);
    }
  }
  for (const [name, list] of castTimes) {
    const e = info.get(name);
    if (e) e.castMsMedian = median(list);
  }
  for (const [name, from] of ICON_ALIASES) {
    const src = from.find((n) => info.get(n)?.icon);
    if (!info.has(name) && src) info.set(name, { name, icon: info.get(src)!.icon, status: true, casts: 0, applied: 0, aliasOf: src });
  }
  const icons = new Map<string, string>();
  for (const [n, e] of info) if (e.icon) icons.set(n, e.icon);
  const names = [...icons.keys()].filter((n) => n.length >= 3 && !AUTO_ATTACK.test(n)).sort((a, b) => b.length - a.length);
  return {
    icons, info, pulls: played,
    game: pulls[0]?.game === "wow" ? "wow" : "ffxiv",
    re: names.length ? new RegExp(`(?<![A-Za-z])(${names.map(escapeRe).join("|")})(?![A-Za-z])`, "g") : null,
  };
}

export const firstAbility = (text: string, a: AbilityIcons): string | undefined => {
  if (!a.re) return undefined;
  a.re.lastIndex = 0;
  return a.re.exec(text)?.[1];
};

/** Finding text with each matched ability name drawn as an AbilityName. */
export function RichDetail({ text, icons }: { text: string; icons: AbilityIcons }) {
  if (!icons.re) return <>{text}</>;
  const parts = text.split(icons.re);
  // split with one capture group: odd indexes are the matched names.
  return (
    <>
      {parts.map((part, i) => i % 2 === 0 ? part : <AbilityName key={i} name={part} icons={icons} />)}
    </>
  );
}

/** An ability's icon and name, with the hover tooltip and click-through. */
export function AbilityName({ name, icons }: { name: string; icons: AbilityIcons }) {
  return (
    <AbilityTip name={name} icons={icons} style={{ whiteSpace: "nowrap", fontWeight: 600, color: ABILITY_COLOR }}>
      <img src={icons.icons.get(name)} alt="" width={15} height={15}
        style={{ verticalAlign: -3, marginRight: 3, borderRadius: 2 }}
        onError={(e) => { e.currentTarget.style.display = "none"; }} />
      {name}
    </AbilityTip>
  );
}

const gameOf = (g: AbilityIcons["game"]): DamageGame => (g === "wow" ? WOW_DAMAGE : FFXIV_DAMAGE);
// WoW only: FFXIV names don't link out (user, 2026-10-14: no Garland Tools).
function externalUrl(a: AbilityInfo, game: AbilityIcons["game"]): string | undefined {
  if (a.id === undefined || a.aliasOf || game !== "wow") return undefined;
  return `https://www.wowhead.com/spell=${a.id}`;
}
const secs = (ms: number) => `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;

/** Wraps children in a hover/focus target that shows the ability's tooltip. */
export function AbilityTip({ name, icons, children, style }: {
  name: string; icons: AbilityIcons; children: ReactNode; style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const a = icons.info.get(name);
  if (!a) return <span style={style}>{children}</span>;
  const url = externalUrl(a, icons.game);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 290)) });
  };
  const action = a.status || a.id === undefined ? undefined : gameOf(icons.game).action(a.id);
  const lines: string[] = [];
  if (a.aliasOf) lines.push(`Gauge timer, kept up by ${a.aliasOf}`);
  else if (action) {
    const parts = [action.onGcd ? "GCD" : "Off-GCD"];
    if (action.onGcd && action.recastMs > 0) parts.push(`${secs(action.recastMs)} recast`);
    if (action.cooldownMs > Math.max(action.recastMs, 0) || (!action.onGcd && action.cooldownMs > 0)) parts.push(`${secs(action.cooldownMs)} cooldown`);
    if (action.charges > 1) parts.push(`${action.charges} charges`);
    lines.push(parts.join(" · "));
  } else if (a.status) lines.push(a.applied > 0 ? "Status" : "Damage or effect");
  if (a.castMsMedian) lines.push(`${secs(Math.round(a.castMsMedian / 100) * 100)} cast (this player's median)`);
  const where = icons.pulls > 1 ? `in ${icons.pulls} pulls` : "this pull";
  if (a.casts > 0) lines.push(`Used ${a.casts} time${a.casts === 1 ? "" : "s"} ${where}`);
  else if (a.applied > 0) lines.push(`Applied ${a.applied} time${a.applied === 1 ? "" : "s"} ${where}`);

  return (
    <>
      <span ref={ref} tabIndex={0} style={{ cursor: url ? "pointer" : "help", outline: "none", ...style }}
        onMouseEnter={show} onMouseLeave={() => setPos(null)} onFocus={show} onBlur={() => setPos(null)}
        onClick={(e) => { if (!url) return; e.stopPropagation(); window.open(url, "_blank", "noopener,noreferrer"); }}>
        {children}
      </span>
      {pos && createPortal(
        <div role="tooltip" style={{
          position: "fixed", top: pos.top, left: pos.left, zIndex: 2100, width: 280, pointerEvents: "none",
          background: "#0d1013", border: "1px solid var(--ck-frame-soft)", borderRadius: 3, padding: "8px 10px",
          fontSize: 12, lineHeight: 1.5, color: "var(--ck-text)", boxShadow: "0 6px 20px rgba(0,0,0,0.55)",
          fontWeight: 400, whiteSpace: "normal",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            {a.icon && <img src={a.icon} alt="" width={30} height={30} style={{ borderRadius: 3, flex: "0 0 auto" }} />}
            <span style={{ color: ABILITY_COLOR, fontWeight: 700, fontSize: 13 }}>{a.name}</span>
          </div>
          {lines.map((l, i) => <div key={i} style={{ color: i === 0 ? "var(--ck-text)" : "var(--ck-text-2)" }}>{l}</div>)}
          {url && (
            <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginTop: 4 }}>
              Click for the full tooltip on Wowhead
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
