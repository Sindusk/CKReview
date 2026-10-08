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
  // The log site's icon filename for the action (FFLogs "000000-000806.png"),
  // so a column has its icon even when nobody cast it in the loaded pulls.
  icon?:      string;
};

// What the analysis needs from a game: its catalog and how to read a
// hit's damage type. FFXIV's lives in ffxiv-catalog.ts.
export type MitigationGame = {
  catalog:     CatalogEntry[];
  statusIndex: Map<number, { entry: CatalogEntry; status: CatalogStatus }>;
  actionIndex: Map<number, CatalogEntry>;
  // Damage that is never a hit: DoT ticks the log doesn't flag as ticks,
  // and enemy auto-attacks.
  isTick(abilityId: number): boolean;
  isAutoAttack(abilityName: string): boolean;
  // "none" = % mitigation does not apply (FFXIV unaspected); undefined =
  // unknown (pull fetched before damage types were kept).
  damageColumn(damageType: number | undefined): "physical" | "magical" | "none" | undefined;
};

// ── Analysis output ────────────────────────────────────────────────────

// fail: a non-vulnerable player died. Otherwise by the lowest player's
// health after the hit: under < 15%, good 15-30%, over 30%+.
export type HitVerdict = "fail" | "under" | "good" | "over";

// One damage event of a hit on one player. A multi-hit attack (Brutal Rain
// hits four times about a second apart) gives each target several parts.
export type HitPart = {
  timestampMs:   number;
  damage:        number;          // to health, overkill included
  absorbed:      number;          // by shields
  healthAfter:   number;          // negative = overkill
  statusIds:     number[];        // catalog statuses on the target for this part
  shieldAbsorbs: { statusId: number; caster?: string; amount: number }[];
};

export type HitTarget = {
  player:        string;
  job:           string;
  tank:          boolean;
  maxHealth:     number;
  healthBefore:  number;          // before the first part
  healthAfter:   number;          // lowest after any part
  damage:        number;          // to health, all parts, overkill included
  absorbed:      number;          // by shields, all parts
  // Damage before any mitigation, all parts: FFLogs' unmitigatedAmount, or
  // rebuilt from the multiplier when the log leaves it out.
  unmitigated?:  number;
  multiplier?:   number;          // FFLogs' % product (vuln included), first part
  catalogProduct: number;         // product of the catalog % statuses present, first part
  // |catalogProduct - multiplier| within rounding. False usually means a
  // status in `buffs` that didn't apply (snapshot lag) or an unknown one.
  consistent:    boolean;
  parts:         HitPart[];
  margin:        number;          // healthAfter / maxHealth; negative = overkill
  // Health fraction lost to later damage in the same sequence (see
  // analyze.ts), so a drop here can't spend headroom a later hit needs.
  laterDrop:     number;
  died:          boolean;
  // A death with near-full health before the hit is a mitigation problem;
  // one from low health is a healing / timing problem.
  deathCause?:   "mitigation" | "healing";
  vulnerable:    boolean;         // carrying a vulnerability-up
  // Under a tank invulnerability (Living Dead and Superbolide leave the
  // tank at 0-1 HP on purpose): left out of the margin like a vulnerable one.
  invulnerable:  boolean;
  statusIds:     number[];        // catalog statuses on this target, any part
  // What each shield took from this hit, all parts (0-amount shields left out).
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
  // Each mitigation that could be dropped on its own (the hit stays Good
  // without it), so a single drop can be offered as "X, Y or Z".
  alternatives: string[];
  candidates:  number;  // planned mitigations on the hit that were considered
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
  waves:         number;  // most parts any target took (multi-hit attacks)
  // Only tanks were hit (a tank buster): the damage averages are the tanks',
  // and personal mitigation counts for droppable and suggestions.
  tankOnly:      boolean;
  targets:       HitTarget[];
  active:        ActiveMitigation[];
  players:       PlayerMitigation[];
  totalDamage:   number;  // to health, all targets
  // Averages per target, all parts summed, over the non-tank targets (the
  // tanks on a tank-only hit), vulnerable players left out.
  rawDamage?:    number;  // before mitigation; undefined when the log has none
  takenDamage:   number;  // to health, after mitigation and shields
  absorbedDamage: number; // by shields
  // Lowest player's health before the hit, vulnerable players left out.
  lowestBefore:  number;
  // Lowest player's health after the hit (at its low point across parts),
  // vulnerable players left out.
  margin:        number;
  // The same, after subtracting each player's laterDrop.
  sequenceMargin: number;
  deaths:        number;  // all deaths to this hit
  // Deaths of players without a vulnerability-up: the ones the verdict
  // counts. A vulnerable player's death is a mechanic failure.
  cleanDeaths:   number;
  verdict:       HitVerdict;
  droppable:     DroppableResult;  // empty unless the verdict is over
  note:          string;           // what could change (lib/mitigation/notes.ts)
};
