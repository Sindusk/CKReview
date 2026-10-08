// lib/mitigation/notes.ts
//
// The Notes column of the Mitigation timeline: a terse hint per hit on what
// could change (user, 2026-10-08). It must fit on one line beside the
// mitigation columns, so it is a verb and a list, never a sentence, and
// never a timestamp (the row shows the time).
//   - over: "Drop A + B" (the droppable set), or "Drop one: A / B / C" when
//     any single drop is enough. Nothing when the hit carried no planned
//     mitigation: it simply didn't need mitigating.
//   - under / fail: "Add A / B": unused mitigations that were off cooldown
//     and would have reached the hit. Free ones first; ones that would delay
//     a later use only when nothing was free.
//   - good: nothing.

import type { CatalogEntry, DroppableResult, MitigationGame, MitigationHit, PlayerMitigation } from "./types";
import type { AggregatedHit } from "./aggregate";

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

function addText(free: PlayerMitigation[], available: PlayerMitigation[]): string {
  if (free.length) return `Add ${joinList(labels(free), " / ")}`;
  if (available.length) return `Add (delays later) ${joinList(labels(available), " / ")}`;
  return "Nothing else available";
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

  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  const unused = hit.players.filter((p) => !p.dead && wouldHelp(entryOf(p.key), hit.tankOnly, hit.damageColumn));
  const add = addText(unused.filter((p) => p.state === "free"), unused.filter((p) => p.state === "available"));

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
  const first = row.byPull[0]?.hit;
  const entryOf = (key: string) => game.catalog.find((e) => e.key === key);
  const usuallyFree = labels(row.free
    .filter((f) => f.pulls * 2 >= row.pulls && wouldHelp(entryOf(f.key), !!first?.tankOnly, row.damageColumn)));
  return deaths + (usuallyFree.length ? `Add ${joinList(usuallyFree, " / ")}` : "Nothing else usually free");
}
