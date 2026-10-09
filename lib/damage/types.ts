// lib/damage/types.ts
//
// Game-neutral shapes for the damage analysis
// (docs/archive/damage-analysis-plan.md). A game supplies a DamageGame
// (lib/damage/ffxiv/game.ts, lib/damage/wow/game.ts); a boss may supply a
// DamageContext; the
// engine (lib/damage/analyze.ts) does the rest. Nothing here is a
// PullError: findings only feed the Damage dialog.

import type { Pull } from "@/types/Pull";
import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { PlayerCheckContext } from "./checks";

// ── Game layer ─────────────────────────────────────────────────────────

export type GameAction = {
  id:            number;
  name:          string;
  onGcd:         boolean;
  // GCD lock at base speed (2.5s for most GCDs). For a GCD with its own
  // cooldown (Gnashing Fang) this is still the lock, not the cooldown.
  recastMs:      number;
  cooldownMs:    number;    // the action's own cooldown (= recastMs for plain GCDs)
  charges:       number;
  speedScaled:   boolean;   // recast shortened by skill/spell speed
  // Status ids this action applies (FFLogs ids).
  appliesStatusIds: number[];
  // A limit break: its animation lock is forced downtime.
  limitBreak?:   boolean;
  // Combo steps this action continues (it gets its combo bonus only after
  // one of them). Undefined for combo starters and non-combo actions.
  comboFrom?:    number[];
  autoAttack?:   boolean;
  // A positional action: the bonusPercent values its hit shows when the
  // positional was missed, and what a miss costs (hit potency ÷ miss
  // potency − 1, applied to the missed hit).
  positional?:   { missedBonus: number[]; missCost: number };
};

export type DamageGame = {
  action(id: number): GameAction | undefined;
  // Damage dealt multiplier under a penalty debuff (Weakness 0.75), or
  // undefined if the status isn't a damage penalty.
  penaltyFactor(statusId: number): number | undefined;
  // Party damage buffs and enemy debuffs that make up burst windows.
  raidBuffStatusIds: Set<number>;
  // What a party buff adds to a hit it's on, for the rDPS split and buff
  // coverage. "damage" = a % multiplier (measured per pull where possible),
  // "crit" / "directHit" = a rate increase. partyWide: one cast reaches
  // the whole party (cards and dance partner buffs don't).
  partyBuff(statusId: number): PartyBuff | undefined;
  // Damage events whose ability id is a status (DoT ticks).
  isTickAbility(abilityId: number): boolean;
  // Cooldowns the drift check judges for a job (display name).
  trackedCooldowns(job: string): TrackedCooldown[];
  // Defensive actions (mitigation), named when they clip a GCD.
  isDefensive(actionId: number): boolean;
  // Enmity swaps (Provoke, Shirk): a gap around one is labelled a tank swap.
  tankSwapActionIds: Set<number>;
  // Ranged filler GCDs used when out of melee range (Lightning Shot).
  disengageActionIds: Set<number>;
  // Job-specific checks (Layer 3), by job display name.
  jobChecks(job: string): JobCheck[];

  // ── Optional, for games unlike FFXIV (WoW, lib/damage/wow/game.ts) ──
  // Unset, each behaves as FFXIV always has.
  // The key jobChecks/trackedCooldowns and findings use (default:
  // className). WoW keys by spec ("Fire Mage"): the class alone doesn't
  // say what the player plays.
  jobOf?(player: PlayerInfo): string;
  // The observed-GCD measurement (timeline.ts speedFactor): intervals count
  // from minIntervalShare × the recast, and the factor is clamped at
  // minFactor (default 0.6 and 0.7; WoW's haste goes further).
  speed?: { minIntervalShare: number; minFactor: number };
  // Statuses that speed up GCDs for their duration (Bloodlust, Power
  // Infusion): GCDs under them get their own speed factor.
  hasteStatusIds?: Set<number>;
  // Channelled GCDs: they log no end, so their lock runs to their last
  // tick before the next GCD (timeline.ts gcdUses).
  isChannel?(actionId: number): boolean;
  // Which damage events make up the player's average GCD value (the price
  // of a GCD gap). Default: on-GCD actions' hits plus every DoT tick.
  // WoW: only the player's own on-GCD abilities (hits and their DoT ticks);
  // procs, trinkets and pets keep going during a gap.
  isGcdDamage?(e: PlayerEvent): boolean;
  // Reference-clear comparison (lib/damage/compare.ts): compare from the
  // pull start when the context names no deciding phase, and show role
  // rows as per-player averages (WoW raid comps vary; FFXIV's are 2/2/4).
  compareFromPullStart?: boolean;
  compareRolesPerPlayer?: boolean;
};

export type JobCheck = (ctx: PlayerCheckContext) => DamageFinding[];

export type PartyBuff = {
  name:       string;
  damage?:    number;     // +5% = 0.05
  crit?:      number;     // crit rate, +10% = 0.10
  directHit?: number;     // direct-hit rate
  // Haste (WoW Power Infusion): more casts, not bigger hits. Its share of a
  // hit is estimated as haste ÷ (1 + haste), and marked approximate.
  haste?:     number;
  // Role-dependent % (Astrologian cards): melee/tanks vs ranged/healers.
  damageByRange?: { melee: number; ranged: number };
  partyWide:  boolean;
};

export type TrackedCooldown = {
  name:             string;
  actionIds:        number[];   // several = one shared recast
  cooldownMs:       number;
  charges:          number;
  firstUseOffsetMs: number;
  holdMs?:          number;     // allowed hold per ready stretch; default COOLDOWN_HOLD_MS
  // Actions that only follow this cooldown: one cast before its first use
  // in the pull means it was used before the pull.
  prePullEvidenceIds?: number[];
};

// ── Fight context (per boss) ───────────────────────────────────────────

export type PhaseContext = {
  pool?:          number;    // the phase's HP pool, when fixed
  fixedPool?:     boolean;
  carriesOver?:   boolean;   // extra damage spills into the next phase
  decidesEnrage?: boolean;   // the phase whose DPS decides the enrage
  // false: damage in this phase changes nothing (no pool to kill, doesn't
  // carry over). Losses there are shown as forced.
  damageCounts?:  boolean;
  multiTarget?:   boolean;   // several bosses: single-target expectations don't apply
  note?:          string;
};

export type ForcedWindow = {
  startMs:  number;
  endMs:    number;
  cause:    string;
  players?: string[];        // undefined = everyone
};

export type DamageContext = {
  encounter: string;
  phases:    Record<number, PhaseContext>;   // keyed by the log's phase id
  // Windows where uptime loss isn't the player's fault.
  forcedWindows?(pull: Pull): ForcedWindow[];
  // A name for a mechanic occurrence key, used to say what was happening
  // during a gap ("during Towers (P5)"). Labels only; never excuses a gap.
  mechanicLabel?(mechanicKey: string): string | undefined;
};

// ── Findings ───────────────────────────────────────────────────────────

export type FindingKind =
  | "gcd-gap"           // one idle stretch of 1s+
  | "gcd-delays"        // the sum of a phase's small delays
  | "gcd-clipping"      // small delays with three or more weaves between GCDs
  | "cooldown-drift"    // a cooldown held long enough to lose a use
  | "death"             // time dead
  | "penalty"           // damage dealt under Damage Down / Weakness
  | "proc-lost"         // a proc that expired unused or was overwritten
  | "interrupted-cast"  // a cast that never went off
  | "no-damage"         // a damage action that hit nothing (invulnerable, out of range)
  | "combo-broken"      // a combo step that landed without its combo bonus, or a combo dropped
  | "disengage"         // a ranged filler GCD (Lightning Shot) instead of a real one
  | "positional"        // positionals missed
  | "buff-coverage"     // a party buff that missed living players
  | "burst-window"      // the job's own burst buff missing GCDs or actions
  | "buff-uptime"       // a job damage buff (Darkside, Surging Tempest) down
  | "gauge-overcap"     // job gauge wasted at its cap
  | "heal-gcd"          // a heal GCD that mostly overhealed
  | "aoe-single"        // an AoE damage GCD that hit one enemy (worse than the filler)
  | "dot-uptime"        // the player's DoT off the boss
  | "dot-clip";         // the player's DoT refreshed early

export type DamageFinding = {
  player:     string;
  job:        string;
  kind:       FindingKind;
  startMs:    number;
  endMs:      number;
  phaseId?:   number;
  phase?:     string;
  // Estimated damage lost, in the player's own observed damage. 0 when not
  // estimated (the basis says why).
  lostDamage: number;
  // Shown, but not counted against the player.
  forced:     boolean;
  cause?:     string;
  basis:      string;    // how lostDamage was estimated
  detail:     string;    // one line for the dialog
  // Short and pull-independent ("Technical Step", "gap during Limit Cut"):
  // the same label in two pulls is the same recurring finding.
  label:      string;
  inference?: boolean;   // rests on inference rather than a measured value
  // A summary over separate moments (small GCD delays, early DoT refreshes,
  // missed positionals): when each happened, and what that one was and
  // cost. The dialog's strip marks these instead of the whole startMs–endMs
  // span, which can cover the pull, and its tooltip describes just the one.
  moments?:   Moment[];
};

export type Moment = Window & { detail?: string; lostDamage?: number };

type Window = { startMs: number; endMs: number };

// ── Analysis output ────────────────────────────────────────────────────

export type PlayerDamageSummary = {
  player:        string;
  job:           string;
  role:          string;
  damage:        number;     // dealt in the analysed window
  lostDamage:    number;     // unforced findings
  forcedDamage:  number;     // forced findings
  gcds:          number;
  baseGcdMs:     number;     // the player's observed GCD
  // GCD locks over the time the player was alive, the boss targetable and
  // no limit break running (timeline.ts gcdUptime). pct is 0-1.
  gcdUptime:     { pct: number; activeMs: number; eligibleMs: number };
  // GCDs by what they did: heal (landed heals or shields), damage, other
  // (raises, Esuna). The healer headline: heal GCDs against damage taken.
  gcdSplit:      { heal: number; damage: number; other: number };
  // The rDPS split (docs/dps-analysis.md method step 5): what this player's
  // party buffs added to others' hits, and what others' buffs added to
  // theirs. `approximate` when crit or direct-hit buffs were involved
  // (their value is estimated, not read from the multiplier).
  buffs:         { given: number; received: number; approximate: boolean };
  findings:      DamageFinding[];
  // For the dialog's timeline strip.
  timeline: {
    gcdStarts:   number[];
    healGcdStarts: number[];
    buffWindows: { startMs: number; endMs: number }[];
    forced:      ForcedWindow[];
  };
};

export type PhaseDamageSummary = {
  phaseId:        number;
  name:           string;
  startMs:        number;
  endMs:          number;
  context?:       PhaseContext;
  raidDamage:     number;
  raidLostDamage: number;    // unforced
  // Damage the party took (to health plus what shields absorbed).
  raidDamageTaken: number;
  // The pull ended in this phase with the boss alive: its HP at the end.
  bossHpLeft?:    number;
};

export type PullDamageAnalysis = {
  pullId:        number;
  pullNumber:    number;
  // Where the analysis stops: the pull end, or the wipe collapse (6+
  // deaths within 15s), after which the log is the raid lying dead.
  endMs:         number;
  collapseMs?:   number;
  context?:      string;     // DamageContext.encounter, if one exists
  // Data the pull lacks (fetched before it existed). Re-fetching is the
  // user's call.
  missingData:   string[];
  raidDowntime:  ForcedWindow[];
  players:       PlayerDamageSummary[];
  phases:        PhaseDamageSummary[];
};
