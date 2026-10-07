// lib/mitigation/types.ts
//
// Game-neutral shapes for the mitigation analysis
// (docs/archive/mitigation-redesign.md). A game supplies a catalog of these
// entries; lib/mitigation/analyze.ts does the rest.

export type MitigationKind =
  | "bossDebuff"  // on the enemy: Reprisal, Feint, Addle, Dismantle
  | "partyBuff"   // % reduction on the party: Troubadour, Kerachole, Holos
  | "shield"      // absorbs a fixed amount instead of a %
  | "personal"    // self or single-target %: Rampart, Third Eye, Aquaveil
  | "invuln"      // tank invulnerabilities (later phase; kept so a hit under one is recognized)
  | "limitBreak"; // tank LB: no cooldown to track

export type MitigationReach = "self" | "target" | "party";

// One status an entry can put on a hit. Some casts apply several (Holy
// Sheltron: Holy Sheltron 15% plus Knight's Resolve 15% for the first 4s),
// and the reductions multiply.
export type CatalogStatus = {
  id:        number;
  name:      string;
  physical:  number;   // fraction, 0.1 = 10%
  magical:   number;
  shield?:   boolean;  // absorbs instead of reducing
};

export type CatalogEntry = {
  key:        string;    // stable id, e.g. "reprisal"
  name:       string;    // the action's name
  jobs:       string[];  // job display names (lib/ffl-job-data.ts), e.g. "Dark Knight"
  actionIds:  number[];  // casts that start it
  statuses:   CatalogStatus[];
  kind:       MitigationKind;
  reach:      MitigationReach;
  durationMs: number;
  cooldownMs: number;    // 0 for GCD shields (always available, never "free")
  charges?:   number;    // default 1
  // Gated by a gauge or by another action (Sun Sign needs Neutral Sect,
  // Divine Caress follows Temperance): availability is approximate.
  gated?:     string;
  // Can end before durationMs (a channel, or a ground effect players leave),
  // so being within its duration doesn't mean it should be on a hit.
  variableDuration?: boolean;
  // false: recognized on hits (so the math stays right) but never shown as
  // a column, graded for availability or offered as droppable. For things
  // the group doesn't plan as mitigation (Astrologian cards, per the user).
  inSheet?:   false;
  // True once the action and status IDs were seen in a real log.
  verified:   boolean;
};

// What the analysis needs from a game: its catalog and how to read a
// hit's damage type. FFXIV's lives in ffxiv-catalog.ts.
export type MitigationGame = {
  catalog:     CatalogEntry[];
  statusIndex: Map<number, { entry: CatalogEntry; status: CatalogStatus }>;
  actionIndex: Map<number, CatalogEntry>;
  // "none" = % mitigation does not apply (FFXIV unaspected); undefined =
  // unknown (pull fetched before damage types were kept).
  damageColumn(damageType: number | undefined): "physical" | "magical" | "none" | undefined;
};

// ── Analysis output ────────────────────────────────────────────────────

export type HitVerdict = "under" | "tight" | "over";

export type HitTarget = {
  player:        string;
  job:           string;
  maxHealth:     number;
  healthBefore:  number;
  healthAfter:   number;
  damage:        number;          // to health
  absorbed:      number;          // by shields
  unmitigated?:  number;          // FFLogs' unmitigatedAmount
  multiplier?:   number;          // FFLogs' % product (vuln included)
  catalogProduct: number;         // product of the catalog % statuses present
  // |catalogProduct - multiplier| within rounding. False usually means a
  // status in `buffs` that didn't apply (snapshot lag) or an unknown one.
  consistent:    boolean;
  margin:        number;          // healthAfter / maxHealth; negative = overkill
  // Health fraction lost to later damage in the same sequence (see
  // analyze.ts), so a drop here can't spend headroom a later hit needs.
  laterDrop:     number;
  died:          boolean;
  // A death with near-full health before the hit is a mitigation problem;
  // one from low health is a healing / timing problem.
  deathCause?:   "mitigation" | "healing";
  vulnerable:    boolean;         // carrying a vulnerability-up
  statusIds:     number[];        // catalog statuses on this target at the hit
  // What each shield took from this hit (0-amount shields left out).
  shieldAbsorbs: { statusId: number; caster?: string; amount: number }[];
};

export type ActiveMitigation = {
  key:       string;
  name:      string;
  kind:      MitigationKind;
  casters:   string[];   // empty when the cast wasn't found (e.g. before capture start)
  targets:   number;     // how many of the hit's targets carried it
};

export type MitigationState =
  | "used"        // on this hit, cast by this player
  | "free"        // off cooldown, and casting it here would not delay this player's next real use
  | "available"   // off cooldown but not free (a later real use would be delayed)
  | "cooldown"    // spent elsewhere
  | "ineffective" // cast and still within its duration, yet not on this hit (wrong target, out of range)
  | "dead";       // player dead or just raised

export type PlayerMitigation = {
  player:     string;
  job:        string;
  key:        string;
  name:       string;
  kind:       MitigationKind;
  state:      MitigationState;
  lastCastMs?: number;  // this player's latest cast at or before the hit
  readyMs?:    number;  // when it is next off cooldown, if on cooldown
  nextCastMs?: number;  // this player's next real cast after the hit
  approximate: boolean; // gated entry: availability is a guess
};

export type DroppableResult = {
  keys:        string[];
  names:       string[];
  worstMargin: number;  // lowest player's margin with those removed (after the roll buffer)
};

export type MitigationHit = {
  id:            string;  // `${phase}|${abilityName}#${occurrence}`, the cross-pull match key
  abilityId:     number;
  abilityName:   string;
  occurrence:    number;  // 1-based, per ability name within its phase
  timestampMs:   number;  // first damage of the hit, ms into the pull
  endMs:         number;  // last damage of the hit
  castMs?:       number;  // matching boss cast, when one is found
  phase?:        string;
  damageColumn?: "physical" | "magical" | "none";
  sequenceId:    number;  // hits a few seconds apart share one
  targets:       HitTarget[];
  active:        ActiveMitigation[];
  players:       PlayerMitigation[];
  totalDamage:   number;  // to health, all targets
  // Lowest player's margin, vulnerable players left out.
  margin:        number;
  // The same, after subtracting each player's laterDrop.
  sequenceMargin: number;
  deaths:        number;  // all deaths to this hit
  // Deaths of players without a vulnerability-up: the ones the verdict
  // counts. A vulnerable player's death is a mechanic failure.
  cleanDeaths:   number;
  verdict:       HitVerdict;
  droppable:     DroppableResult;
};
