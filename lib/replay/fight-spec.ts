// lib/replay/fight-spec.ts
//
// What one fight adds to the top-down replay, in one file per fight next
// to its detection modules (lib/mechanics/ffxiv/fru/replay.ts,
// lib/mechanics/wow/va/vashnik-replay.ts, ...), with its art in
// components/replay-art/<fight>.tsx. The shared engine draws every AoE from
// game data (action-shapes.ts, wow-shapes.ts); a fight file holds only what
// the data gets wrong or can't say, so fights can be built in parallel
// without touching each other's files or the engine:
//
//   overrides     per-ability fixes to the game-data shapes (Override)
//   headMarkers   marker ids -> the label shown and the abilities they announce
//   markerAoes    markers that put a circle on their player until it drops
//   tethers       tether ids with a meaning: their element and payoff hits
//   effects       boss cues the log names only through a cast (CasterEffect),
//                 drawn by the fight's art file under `kind`. An effect can
//                 follow an `actor`, point at another (`aimAt`: a cone from
//                 the boss tracking its tank), move along a modelled `path`
//                 (objects the log never tracks), carry a `bearing` (a
//                 wind), or `shake` its actor's icon (a player struck)
//   floorStatuses statuses that change the whole floor while the party has them
//   slideStatuses / jailStatuses  player decorations (slide trail, cage)
//   shapes        extra AoeShapes the overrides can't express
//   wowAuraShapes / hiddenHits    WoW: debuff circles, hits drawn some other way
//   notes         standing limits shown top right: a mechanic the log can't
//                 place, said outright instead of drawn as a guess
//   hitboxes      WoW: enemy hitbox radii by name (WCL gives none)
//
// A spec applies to a pull when any of its `signature` ability ids, or any
// ability id it overrides or names, shows up in the pull's casts, hits or
// WoW auras (fights.ts's fightReplaysFor). Marker and tether ids are the
// game's icons and repeat across fights, which is why they are scoped by
// fight and not merged into one table.
//
// Registered in lib/replay/fights.ts (data) and components/replay-art/
// index.ts (art); every fight in the docs map already has both, so a
// fight's work edits only its own two files. Effect kinds are global
// names: start new ones with the fight's key ("top-..."). The /build-replay
// skill is the workflow that fills these in.

import type { AoeShape } from "./action-shapes";
import type { ReplayData } from "./ffxiv-replay";

/**
 * Per-ability corrections the game data can't give, each from a log or the
 * user's VOD review. Keyed by ability id.
 */
export type Override = {
  angle?:   number;
  style?:   AoeShape["style"];
  hidden?:  boolean;
  soakers?: number;          // towers: the number drawn in the middle
  twoWay?:  boolean;         // a line through its caster, not from it
  flip?:    boolean;         // a cone pointing behind the caster
  // The caster is a parked helper with no sample near the cast: use its
  // last one within HOLD_CASTER_MS.
  holdCaster?: boolean;
  aim?:     "hits";          // a cone aimed at the players it hit, not the caster's facing
  // Starts at the target of the latest cast of this ability within 1.5s
  // (the caster's own position is stale).
  originAt?: number;
  // Centred on the player whose status (FFLogs id) ended at the cast:
  // a Spell-in-Waiting resolving on its holder. Needs playerAuras.
  holder?:  number;
  // A repeat of the same caster's earlier baited cast `of`: it fires from
  // the bait's origin, alternating between the bait's lane (1st, 3rd
  // repeat) and the lane turned by `gap` degrees (2nd). The caster's logged
  // facing follows the players instead.
  repeats?: { of: number; gap: number };
  // A ground telegraph shown for its whole cast bar, not just as it lands:
  // a fixed spot the players read ahead of time.
  telegraph?: boolean;
  star?:    boolean;         // a cross telegraphed as star points until it fires
  // Starts where the caster of the latest of these abilities (within 8s)
  // stood: the boss these cones really come from, not the helper casting.
  originCaster?: number[];
  // Leaves a puddle where it landed for this long (ms).
  puddleMs?: number;
};

/**
 * A head marker's label, shown only when one of `abilities` then hits (or
 * is cast by) the marked actor, within `lookaheadMs` (default 12s; TEA's
 * Limit Cut #8 lands 25s after its marker).
 */
export type HeadMarkerDef = { label: string; abilities: number[]; lookaheadMs?: number };

/** A head marker that puts `ability`'s circle on its player until it drops. */
export type MarkerAoe = { ability: number; name: string };

/**
 * A tether with a known meaning: drawn in `element` (fire and lightning
 * are built in; any other name is looked up in the fight's art `tethers`)
 * and ended by one of `payoff` hitting the tethered player.
 */
export type TetherKind = {
  element: string;
  payoff: number[];
  // A tether players take from each other, this many at once (TOP's
  // Blaster: two). The log logs each take as a new tether, so a new one
  // beyond the count ends the live one from the same enemy, else the one
  // held nearest its new holder; a
  // payoff then ends only a tether nobody took. Payoffs land on the
  // player end, whichever end that is.
  passed?: number;
  // Ends when the player end's status of one of these ids runs out (TOP
  // Hello World's Local / Remote Regression tethers break by distance,
  // which the log shows only as the status ending), not at a payoff.
  endStatus?: number[];
};

/**
 * A boss cue: an effect drawn on the arena for a while, art chosen by
 * `kind` (components/replay-art). `layer: "floor"` draws it under the AoEs.
 */
export type CasterEffect = {
  kind:    string;
  layer?:  "floor";
  radius?: number;              // centi-yalms, for art that has a size (halos, floors)
  label:   string;              // what it means, under the boss
  actor?:  string;              // follows this actor while it has samples
  // Points at this actor: the art gets its position as `aim` (a cone from
  // the boss that tracks its tank through the cast bar, WoW Ravage).
  aimAt?:  string;
  // Moves along these points (ms from pull start, centi-yalms), straight
  // between them, holding the first before it and the last after it: an
  // object the log never tracks whose motion the spec models (WoW Tempest's
  // tornadoes).
  path?:   { t: number; x: number; y: number }[];
  // Jolts the `actor`'s icon for the effect's span, settling out: a player
  // struck by a hit (WoW Ravage / Mutilate).
  shake?:  boolean;
  bearing?: number;             // compass degrees, for art that points (a wind's direction)
  x: number; y: number;         // else stays here (centi-yalms)
  start: number; end: number;   // ms from pull start
};

/** A status that changes the whole floor while the party carries it. */
export type FloorStatus = { kind: string; label: string; radius: number };

/** WoW: a debuff drawn as a circle around its player; `spell` gives the radius. */
export type WowAuraShape = { spell: number; name: string; onRemove?: "axis-lanes" };

export type FightReplay = {
  key:   string;                // matches components/replay-art's key
  game:  "ffxiv" | "wow";
  name:  string;
  signature?: number[];
  overrides?: Record<number, Override>;
  headMarkers?: Record<number, HeadMarkerDef>;
  markerAoes?: Record<number, MarkerAoe>;
  // An array: one tether id with several meanings (Dancing Mad's statue
  // tethers are all 45, yellow or purple by what they pay off); the first
  // whose payoff then hits the tethered player is it, and with none it's
  // drawn plain.
  tethers?: Record<number, TetherKind | TetherKind[]>;
  effects?: (data: ReplayData) => CasterEffect[];
  floorStatuses?: Record<number, FloorStatus>;
  slideStatuses?: number[];
  jailStatuses?: number[];
  shapes?: (data: ReplayData) => AoeShape[];
  wowAuraShapes?: Record<number, WowAuraShape>;
  hiddenHits?: number[];
  // Standing limits shown top right for the whole pull: a mechanic the log
  // can't place, said outright so it doesn't look missing.
  notes?: string[];
  // WoW: enemy hitbox radii (centi-yards) by name, which WCL doesn't give:
  // the target ring's size, and the boss icon grows to fit it.
  hitboxes?: Record<string, number>;
};
