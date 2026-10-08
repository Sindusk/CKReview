// lib/mitigation/notes.ts
//
// The Notes column of the Mitigation timeline: one short sentence per hit
// on what could change (user, 2026-10-08). Built from the analysis, never
// from timestamps (the row shows the time).
//   - over: what could be dropped and still land good (the droppable set,
//     or each single alternative when one drop is enough).
//   - under / fail: which unused mitigations were off cooldown and would
//     have reached the hit. Free ones first; ones that would delay a later
//     use only when nothing was free.
//   - good: nothing.

import type { CatalogEntry, DroppableResult, MitigationGame, MitigationHit, PlayerMitigation } from "./types";
import type { AggregatedHit } from "./aggregate";

const MAX_LISTED = 4;

const firstName = (player: string) => player.split(" ")[0];

/** "A", "A or B", "A, B or C" (and "and N more" past MAX_LISTED). */
export function joinList(items: string[], word: "or" | "and"): string {
  const shown = items.slice(0, MAX_LISTED);
  const more = items.length - shown.length;
  if (more > 0) return `${shown.join(", ")} ${word} ${more} more`;
  if (shown.length <= 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} ${word} ${shown[shown.length - 1]}`;
}

/**
 * Whether an unused mitigation would have helped this hit: party-wide on a
 * group hit, anything on a tank-only one, and only shields when % mitigation
 * doesn't apply (unaspected damage).
 */
function wouldHelp(entry: CatalogEntry | undefined, tankOnly: boolean, column: MitigationHit["damageColumn"]): boolean {
  if (!entry) return false;
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

function suggestions(free: PlayerMitigation[], available: PlayerMitigation[]): string {
  if (free.length) return `could also use ${joinList(labels(free), "or")}, free here.`;
  if (available.length) {
    const names = labels(available);
    return `${joinList(names, "or")} ${names.length > 1 ? "were" : "was"} available, at the cost of delaying a later use.`;
  }
  return "nothing else that reaches this hit was off cooldown.";
}

function dropText(drop: DroppableResult, casters: Map<string, string[]>): string {
  const { names, alternatives } = drop;
  const label = (n: string) => withCasters(n, casters.get(n) ?? []);
  if (drop.candidates === 0) return "Over without any planned mitigation; nothing to drop.";
  if (names.length === 0) return "Overmitigated, but nothing can be dropped without going under.";
  if (names.length === 1 && alternatives.length > 1) return `Overmitigated: could drop ${joinList(alternatives.map(label), "or")}.`;
  return `Overmitigated: could drop ${joinList(names.map(label), "and")}.`;
}

export function hitNote(hit: MitigationHit, game: MitigationGame): string {
  if (hit.verdict === "good") return "";
  if (hit.verdict === "over") {
    const casters = new Map(hit.active.map((a) => [a.name, a.casters]));
    return dropText(hit.droppable, casters);
  }

  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  const unused = hit.players.filter((p) => wouldHelp(entryOf(p.key), hit.tankOnly, hit.damageColumn));
  const free = unused.filter((p) => p.state === "free");
  const available = unused.filter((p) => p.state === "available");
  const help = suggestions(free, available);

  if (hit.verdict === "fail") {
    const dead = hit.targets.filter((t) => t.died && !t.vulnerable);
    const names = joinList(dead.map((t) => firstName(t.player)), "and");
    const healing = dead.every((t) => t.deathCause === "healing");
    const cause = healing ? " from low health (healing before the hit)" : "";
    return `${names} died${cause}; ${help}`;
  }
  return `Undermitigated: ${help}`;
}

export function aggregateNote(row: AggregatedHit, game: MitigationGame): string {
  const deaths = row.deathPulls > 0 ? `Deaths in ${row.deathPulls} of ${row.pulls} pulls. ` : "";
  if (row.verdict === "good") return deaths.trim();
  if (row.verdict === "over") {
    const casters = new Map(row.active.map((a) => [
      a.name, Object.entries(a.casters).sort((x, y) => y[1] - x[1]).slice(0, 1).map(([c]) => c),
    ]));
    return deaths + dropText(row.droppable, casters);
  }
  const first = row.byPull[0]?.hit;
  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  const usuallyFree = labels(row.free
    .filter((f) => f.pulls * 2 >= row.pulls && wouldHelp(entryOf(f.key), !!first?.tankOnly, row.damageColumn)));
  const help = usuallyFree.length
    ? `could also use ${joinList(usuallyFree, "or")}, usually free here.`
    : "nothing else that reaches this hit was usually free.";
  return `${deaths}${row.verdict === "fail" ? "Failed" : "Undermitigated"}: ${help}`;
}
