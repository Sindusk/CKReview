// lib/mitigation/notes.ts
//
// The Notes column of the Mitigation timeline: a terse hint per hit on what
// could change (user, 2026-10-08). It must fit on one line beside the
// mitigation columns, so it is a verb and a list, never a sentence, and
// never a timestamp (the row shows the time).
//   - over: "Drop A + B" (the droppable set), or "Drop one: A / B / C" when
//     any single drop is enough. Nothing when the hit carried no planned
//     mitigation: it simply didn't need mitigating.
//   - under / fail: "Add A / B": unused mitigations that were off cooldown,
//     would have reached the hit, and on their own would have lifted the
//     lowest player to good (analyze.ts lowestWithAdded; user, 2026-10-09).
//     Free ones first; ones that would delay a later use only when nothing
//     was free. When none is enough alone, "Not enough alone: A / B", best
//     first. Shields have no estimate here (their capacity isn't logged), so
//     they never count as enough alone.
//   - good: nothing.
// The timeline's hit details list the same options with their estimates
// (addOptions, aggregateAddOptions).

import type { CatalogEntry, DroppableResult, MitigationGame, MitigationHit } from "./types";
import type { AggregatedHit } from "./aggregate";
import { MARGIN_UNDER, lowestWithAdded } from "./analyze";

const MAX_LISTED = 3;

const firstName = (player: string) => player.split(" ")[0];

/** Items joined by `sep`, with "+N" past MAX_LISTED. */
export function joinList(items: string[], sep: " / " | " + "): string {
  const shown = items.slice(0, MAX_LISTED);
  const more = items.length - shown.length;
  return shown.join(sep) + (more > 0 ? ` +${more}` : "");
}

/**
 * Whether an unused mitigation would have helped this hit: party-wide on a
 * group hit, anything on a tank-only one, and only shields when % mitigation
 * doesn't apply (unaspected damage). Never a situational one (Passage of
 * Arms).
 */
function wouldHelp(entry: CatalogEntry | undefined, tankOnly: boolean, column: MitigationHit["damageColumn"]): boolean {
  // Never suggested, like in the Analysis: it needs specific positioning.
  if (!entry || entry.situational) return false;
  if (!tankOnly && entry.reach !== "party") return false;
  if (column === "none" && entry.kind !== "shield") return false;
  return true;
}

function withCasters(name: string, casters: string[]): string {
  return casters.length ? `${name} (${casters.map(firstName).join("/")})` : name;
}

/** One label per mitigation, its players joined: "Reprisal (Kade/Alice)". */
function labels(list: { name: string; player: string }[]): string[] {
  const byName = new Map<string, string[]>();
  for (const p of list) byName.set(p.name, [...(byName.get(p.name) ?? []), p.player]);
  return [...byName].map(([name, players]) => withCasters(name, players));
}

export type AddOption = {
  key:    string;
  name:   string;
  player: string;
  free:   boolean;  // false: off cooldown, but casting it here delays a later use
  // The hit's lowest HP with it added (the median over pulls in the
  // aggregate); undefined for shields.
  est?:   number;
  pulls?: number;   // aggregate only: pulls where it was free
};

const isShield = (entry: CatalogEntry) => entry.statuses.some((s) => s.shield);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const byEstimate = (a: AddOption, b: AddOption) =>
  Number(b.free) - Number(a.free) || (b.est ?? -Infinity) - (a.est ?? -Infinity) || a.name.localeCompare(b.name);

/** Unused mitigations that would have reached the hit, free first, best estimate first. */
export function addOptions(hit: MitigationHit, game: MitigationGame): AddOption[] {
  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  return hit.players
    .filter((p) => !p.dead && (p.state === "free" || p.state === "available") && wouldHelp(entryOf(p.key), hit.tankOnly, hit.damageColumn))
    .map((p) => {
      const entry = entryOf(p.key)!;
      const est = isShield(entry) ? undefined : lowestWithAdded(hit, entry, p.player, 0);
      return { key: p.key, name: p.name, player: p.player, free: p.state === "free", est: Number.isFinite(est) ? est : undefined };
    })
    .sort(byEstimate);
}

/** Mitigations free in at least half the pulls that reached the hit, with the median estimate over those pulls. */
export function aggregateAddOptions(row: AggregatedHit, game: MitigationGame): AddOption[] {
  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  const tankOnly = row.byPull.every((b) => b.hit.tankOnly);
  return row.free
    .filter((f) => f.pulls * 2 >= row.pulls && wouldHelp(entryOf(f.key), tankOnly, row.damageColumn))
    .map((f) => {
      const entry = entryOf(f.key)!;
      const ests = isShield(entry) ? [] : row.byPull
        .filter(({ hit }) => hit.players.some((p) => p.player === f.player && p.key === f.key && p.state === "free"))
        .map(({ hit }) => lowestWithAdded(hit, entry, f.player, 0))
        .filter(Number.isFinite);
      return { key: f.key, name: f.name, player: f.player, free: true, est: ests.length ? median(ests) : undefined, pulls: f.pulls };
    })
    .sort(byEstimate);
}

const enoughAlone = (o: AddOption) => o.est !== undefined && o.est >= MARGIN_UNDER;

function addText(options: AddOption[], none: string): string {
  const free = options.filter((o) => o.free);
  const pool = free.length ? free : options;
  if (!pool.length) return none;
  const delays = free.length ? "" : "(delays later) ";
  const fixes = pool.filter(enoughAlone);
  if (fixes.length) return `Add ${delays}${joinList(labels(fixes), " / ")}`;
  return `Not enough alone: ${delays}${joinList(labels(pool), " / ")}`;
}

function dropText(drop: DroppableResult, casters: Map<string, string[]>): string {
  const { names, alternatives } = drop;
  const label = (n: string) => withCasters(n, casters.get(n) ?? []);
  if (drop.candidates === 0) return "";
  if (names.length === 0) return "Nothing droppable";
  if (names.length === 1 && alternatives.length > 1) return `Drop one: ${joinList(alternatives.map(label), " / ")}`;
  return `Drop ${joinList(names.map(label), " + ")}`;
}

export function hitNote(hit: MitigationHit, game: MitigationGame): string {
  if (hit.verdict === "good") return "";
  if (hit.verdict === "over") {
    const casters = new Map(hit.active.map((a) => [a.name, a.casters]));
    return dropText(hit.droppable, casters);
  }

  const add = addText(addOptions(hit, game), "Nothing else available");

  if (hit.verdict === "fail") {
    const dead = hit.targets.filter((t) => t.died && !t.vulnerable);
    // Deaths from low health are a healing problem first.
    if (dead.every((t) => t.deathCause === "healing")) return `Low HP before. ${add}`;
  }
  return add;
}

export function aggregateNote(row: AggregatedHit, game: MitigationGame): string {
  const deaths = row.deathPulls > 0 ? `Deaths ${row.deathPulls}/${row.pulls}. ` : "";
  if (row.verdict === "good") return deaths.trim();
  if (row.verdict === "over") {
    const casters = new Map(row.active.map((a) => [
      a.name, Object.entries(a.casters).sort((x, y) => y[1] - x[1]).slice(0, 1).map(([c]) => c),
    ]));
    return (deaths + dropText(row.droppable, casters)).trim();
  }
  return deaths + addText(aggregateAddOptions(row, game), "Nothing else usually free");
}
