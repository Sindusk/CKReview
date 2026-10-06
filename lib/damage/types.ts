// lib/damage/types.ts
//
// Game-neutral shapes for the damage analysis
// (docs/damage-analysis-plan.md). A game supplies a DamageGame
// (lib/damage/ffxiv/game.ts); a boss may supply a DamageContext; the
// engine (lib/damage/analyze.ts) does the rest. Nothing here is a
// PullError: findings only feed the Damage dialog.

import type { Pull } from "@/types/Pull";
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
};

export type DamageGame = {
  action(id: number): GameAction | undefined;
  // Damage dealt multiplier under a penalty debuff (Weakness 0.75), or
  // undefined if the status isn't a damage penalty.
  penaltyFactor(statusId: number): number | undefined;
  // Party damage buffs and enemy debuffs that make up burst windows.
  raidBuffStatusIds: Set<number>;
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
};

export type JobCheck = (ctx: PlayerCheckContext) => DamageFinding[];

export type TrackedCooldown = {
  name:             string;
  actionIds:        number[];   // several = one shared recast
  cooldownMs:       number;
  charges:          number;
  firstUseOffsetMs: number;
  holdMs?:          number;     // allowed hold per ready stretch; default COOLDOWN_HOLD_MS
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
  | "proc-lost"         // a proc that expired unused
  | "interrupted-cast"  // a cast that never went off
  | "combo-broken"      // a combo step that landed without its combo bonus
  | "disengage"         // a ranged filler GCD (Lightning Shot) instead of a real one
  | "burst-window"      // the job's own burst buff missing GCDs or actions
  | "buff-uptime"       // a job damage buff (Darkside, Surging Tempest) down
  | "gauge-overcap"     // job gauge wasted at its cap
  | "heal-gcd"          // a heal GCD that mostly overhealed
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
};

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
  // GCD starts inside raid-buff windows vs how many fit.
  buffWindowGcds: { used: number; fit: number };
  // GCDs by what they did: heal (landed heals or shields), damage, other
  // (raises, Esuna). The healer headline: heal GCDs against damage taken.
  gcdSplit:      { heal: number; damage: number; other: number };
  findings:      DamageFinding[];
  // For the dialog's timeline strip.
  timeline: {
    gcdStarts:   number[];
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
