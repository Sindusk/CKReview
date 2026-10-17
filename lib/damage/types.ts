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
import type { GcdUse } from "./timeline";

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
  // bonusPercent values a combo step shows when its combo did NOT land
  // (only a positional hit): Kasha 160 → 210 logs 23. Any other value
  // means the combo landed.
  comboMissedBonus?: number[];
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
  // Sprint and gap closers (Intervene): woven while a mechanic moves the
  // player, so they don't make a gap a weaving delay (checks.ts CLIP_WEAVES).
  movementActionIds?: Set<number>;
  // A gap that's a deliberate hold, valued by what holding changed rather
  // than idle × GCD (a Dancer's last dance step before Technical Finish):
  // the net loss (≤ 0: the hold paid off, no finding) with its basis.
  holdValue?(ctx: PlayerCheckContext, gap: { gcdStartMs: number; fromMs: number; toMs: number; idleMs: number }):
    { lostDamage: number; label: string; basis: string; detail: string } | undefined;
  // A better ranged GCD the player held when they pressed a ranged filler
  // at t (Viper's Uncoiled Fury with a Rattling Coil): the filler isn't
  // forced then. Returns the reason, or undefined.
  disengageAlternative?(ctx: PlayerCheckContext, t: number): string | undefined;
  // Job-specific checks (Layer 3), by job display name.
  jobChecks(job: string): JobCheck[];
  // The patch a pull was played on ("7.1"), for checks whose rule changed
  // between patches; undefined = unknown, checks use the current rules.
  patchOf?(pull: Pull): string | undefined;
  // The level the encounter syncs players to (FFXIV's older ultimates);
  // undefined = the current cap. Cooldowns learned above it aren't judged.
  levelOf?(pull: Pull): number | undefined;
  // The level an action is learned at (FFXIV: action-levels.ts), for the
  // checks a synced pull can't be judged on (checks.ts learnedAt).
  actionLevel?(actionId: number): number | undefined;
  // Job gauges for the dialog's timeline (display only).
  jobGauges?(job: string): ((ctx: PlayerCheckContext) => GaugeTrack[])[];
  // The player's tincture / potion windows, for the timeline (display only).
  potWindows?(player: PlayerInfo, endMs: number): PotWindow[];
  // Procs a job check handles itself (Viper's venoms, which only boost a
  // finisher): the generic proc check skips them.
  jobProcStatusIds?: Set<number>;
  // A GCD proc's consumer → the GCD it takes the place of (Reverse Cascade
  // → Cascade). A lost proc costs the difference, not the consumer's whole
  // average. Consumers not listed keep the upper bound.
  procReplaces?: Map<number, number>;
  // Proc status → its consumer, declared where the pull can't be trusted to
  // show it: the generic check infers a consumer only from 60% of 3+
  // removals, so a player who drops most of a proc went unjudged.
  procConsumers?: Map<number, number>;
  // Procs another weaponskill clears (Gunbreaker's Continuation: Ready to
  // Rip ends at the next GCD). They never reach their expiry, so a removal
  // at another cast with no consumer beside it is the loss. Each needs a
  // procConsumers entry.
  procsClearedByGcd?: Set<number>;
  // Proc consumers whose own DoT counts in a lost proc's value (Sonic
  // Break): their ticks log under the status's id. Not for a DoT that has
  // its own uptime check.
  procConsumerDots?: Set<number>;
  // A consumer never pressed in the pull has no average of its own: valued
  // as `ratio` × the player's average of `refId`, a ratio measured on the
  // samples (Primal Wrath ≈ 1.20 Fell Cleave).
  procConsumerFallback?: Map<number, { refId: number; ratio: number }>;
  // Procs whose buff events carry no duration (Warcraft Logs logs none, so
  // checkProcs could never see one run out): each proc's natural duration
  // and the presses that spend it, measured from our logs
  // (lib/damage/wow/procs.ts). Only these can expire unused on such a log.
  measuredProcs?: Map<number, MeasuredProc>;
  // Channelled mitigation (Passage of Arms), by action id: from the cast
  // to the player's next action, at most maxMs, is forced (the raid plan,
  // not play).
  mitigationChannels?: Map<number, { name: string; maxMs: number }>;

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
  // The speed-up assumed in a haste window with too few GCDs to measure
  // (default 1.3, Bloodlust). FFXIV: 1, assume none.
  hasteFallback?: number;
  // Per-player GCD speed over time, fitted on the pull (WoW: haste procs
  // and gear, lib/damage/wow/haste.ts). A player it returns replaces the
  // speedProfile's two levels; players it skips keep them.
  // `baseFrom`, `hasteAt` and `ratingC` feed the same-spec pace check
  // (lib/damage/pace.ts); a model without them is never compared.
  speedModels?(pull: Pull, usesOf: Map<string, GcdUse[]>, endMs: number): Map<string, {
    factor: number; at(t: number): number;
    baseFrom?: "instants" | "rating"; hasteAt?(t: number): number; ratingC?: number;
  }>;
  // Channelled GCDs: they log no end, so their lock runs to their last
  // tick before the next GCD (timeline.ts gcdUses).
  isChannel?(actionId: number): boolean;
  // A channel's ticks in a full channel, one at its start included, when a
  // clip drops the last ones (Devastation's Disintegrate: 5). Its lock then
  // runs to where the full channel ends, or to the next GCD if that starts
  // first: the player was channelling, not idle (timeline.ts channelLocks).
  channelTicks?(actionId: number): number | undefined;
  // GCDs that lock the player while a status of their own is up (WoW
  // Devastation's Deep Breath: the flight's buff): the lock runs to that
  // status's removal (timeline.ts gcdUses).
  lockStatus?(actionId: number): number | undefined;
  // Casts the game fires by itself, logged like presses (Arms' Bladestorm
  // casts Mortal Strike during its channel): not GCD uses.
  isAutoCast?(player: PlayerInfo): (cast: PlayerEvent) => boolean;
  // Presses the log never writes as casts, read from the traces they leave
  // (WoW Devourer's Eradicate and Void Metamorphosis: a buff spent or
  // applied): GCD uses like any cast (timeline.ts gcdUses). A returned
  // event's `durationMs` is its lock when that isn't the action's GCD.
  unloggedPresses?(player: PlayerInfo): PlayerEvent[];
  // Which damage events make up the player's average GCD value (the price
  // of a GCD gap). Default: on-GCD actions' hits plus every DoT tick.
  // WoW: only the player's own on-GCD abilities (hits and their DoT ticks);
  // procs, trinkets and pets keep going during a gap.
  // `gcdNames`: names of the on-GCD actions this player cast, for hits
  // logged under another id than their cast.
  isGcdDamage?(e: PlayerEvent, gcdNames: Set<string>): boolean;
  // Reference-clear comparison (lib/damage/compare.ts): compare from the
  // pull start when the context names no deciding phase, and show role
  // rows as per-player averages (WoW raid comps vary; FFXIV's are 2/2/4).
  compareFromPullStart?: boolean;
  compareRolesPerPlayer?: boolean;
};

export type JobCheck = (ctx: PlayerCheckContext) => DamageFinding[];

// DamageGame.measuredProcs: a proc's natural duration, and the presses that
// spend it (the player's most-pressed one is valued; any of them beside the
// removal used it).
export type MeasuredProc = {
  durationMs:  number;
  consumerIds: number[];
};

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
  // Actions that only follow this cooldown: one cast (or hit) before its
  // first use in the pull means it was used before the pull.
  prePullEvidenceIds?: number[];
  // A status of the player's own that only this cooldown applies: removed
  // before its first use with no application before it, it was used
  // before the pull (Devastation's Dragonrage, pressed at −1s).
  prePullStatusIds?: number[];
  // Where its damage logs, when not under its own id (Earthly Star's pet
  // explodes as Stellar Explosion): the value of a lost use.
  damageIds?: number[];
  // Its effect lands this long after the press (Earthly Star matures in
  // 10s): it can be pressed in downtime if that's over by then.
  landDelayMs?: number;
  // Its damage is the player's pet hits (Bunshin's shadow).
  petDamage?: boolean;
  // A cooldown whose worth is what it does to another spell (Assassination's
  // Vanish: the empowered Garrote it allows): the value of one use, with
  // the basis to print. Overrides damageIds / petDamage / own damage.
  // gcdValue: the player's average GCD, for a GCD cooldown whose lost use
  // still had its GCD filled (Retribution's Divine Toll).
  valuePerUse?(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined;
  // Party buffs a use leads to that its action doesn't apply itself
  // (Technical Step → Technical Finish): valued as the buff's average
  // window (checks.ts checkCooldownDrift).
  partyBuffStatusIds?: number[];
  // The opener should use it: a first cast later than firstUseOffsetMs +
  // OPENER_LATE_MS is one use lost whenever the pull had room for one more
  // than were cast, even if the wait was under a full cooldown (the later
  // casts could slide). Nearby's Vanish (qpZx3mWaG7gcDdYB): first at 2:04,
  // the next fitting after Stasis anyway.
  openerUse?: boolean;
  // Patches (DamageGame.patchOf) where it isn't judged: using it on
  // cooldown wasn't a gain there (Pictomancer's Striking Muse in 7.2).
  notOnPatches?: string[];
  // The level it's learned at, when an encounter syncs below it
  // (DamageGame.levelOf): Black Mage's Amplifier (86) in TEA (80) read as
  // never pressed.
  minLevel?: number;
  // holdMs on these patches instead (Gunbreaker's Bloodfest waited for
  // No Mercy before 7.4: 10s).
  holdMsOnPatches?: Record<string, number>;
  // Its recast or charges on these patches, where they differ from the
  // vendored 7.4 data (Bloodfest was 120s before 7.4, not 60s).
  recastOnPatches?: Record<string, { cooldownMs?: number; charges?: number }>;
  // Ready time inside the fight's cooldownHoldWindows isn't held (the
  // spec holds it for the burst the fight sets up; checks.ts).
  burstHold?: boolean;
};

// ── Fight context (per boss)───────────────────────────────────────────

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
  // A cooldownHoldWindows window's target moment (the Heart, the Imbibe):
  // the part after it isn't trimmed by holdWindowsFor. Unset: the end.
  targetMs?: number;
};

export type DamageContext = {
  encounter: string;
  phases:    Record<number, PhaseContext>;   // keyed by the log's phase id
  // Windows where uptime loss isn't the player's fault.
  forcedWindows?(pull: Pull): ForcedWindow[];
  // Windows where a mechanic makes the player move (pairing up, dropping a
  // pool, soaking). Idle inside one beyond the player's own usual idle rate
  // is movement: tracked apart, not counted against them (checks.ts
  // checkGcdGaps). Unlike forced time, the player's usual share still counts.
  movementWindows?(pull: Pull): ForcedWindow[];
  // Windows a cooldown may be held into for a burst the fight sets up
  // (Vashnik's Venoms after each Imbibe): ready time inside them isn't held.
  // Only the drift checks that read it (wow/specs/shared.ts
  // spentCooldownDrift, some spec checks, and checkCooldownDrift for a
  // tracked cooldown marked burstHold); never excuses a GCD gap.
  // Each reader trims a window to its cooldown's last recharge before the
  // window's targetMs (timeline.ts holdWindowsFor): holding a button longer
  // than one recharge loses a use whatever it's held for. Without the cap
  // (to 2026-10-17) a 15s Implosion was excused for Ula'tek's whole P2
  // window (~2 min). Measured with the cap on every Vashnik and Ula'tek
  // sample pull: only short cooldowns moved (Implosion 27.6M → 35.3M over
  // 23 Vashnik rows, Eye Beam 8.3M → 10.1M, Call Dreadstalkers 1.7M →
  // 2.1M); Retribution's 60s cooldowns and Stormkeeper kept their Imbibe
  // excuse (Pçpaladin, Pipala unchanged; Lydd's Implosion 2.24M → 2.50M).
  // On Ula'tek every change is in P2, before the Heart: the P2-start
  // extension now reaches only a cooldown as long as P2's ~2 min before
  // the Heart. Hervous's Avatar and Colossus Smash stay excused (held
  // within one recharge); Polpo's 60s Avenging Wrath, held 3:16 → 4:45,
  // reads 3.12M again (Jgwentworth spent his on the adds at 3:39).
  cooldownHoldWindows?(pull: Pull): ForcedWindow[];
  // A name for a mechanic occurrence key, used to say what was happening
  // during a gap ("during Towers (P5)"). Labels only; never excuses a gap.
  mechanicLabel?(mechanicKey: string): string | undefined;
};

// ── Findings ───────────────────────────────────────────────────────────

export type FindingKind =
  | "gcd-delay"         // one idle stretch between GCDs of 0.3s+: a gap of 1s+, or a small delay (minor)
  | "gcd-drift"         // one GCD under 0.3s late (minor)
  | "gcd-pace"          // a slower base GCD than a same-spec player shows (lib/damage/pace.ts)
  | "gcd-clipping"      // one small delay with three or more weaves between GCDs (minor)
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
  | "gauge-estimate"    // an estimated gauge's overcap (DNC Feathers, Esprit): named, never valued
  | "heal-gcd"          // a heal GCD that mostly overhealed
  | "aoe-single"        // an AoE damage GCD that hit one enemy (worse than the filler)
  | "dot-uptime"        // the player's DoT off the boss
  | "dot-clip"          // the player's DoT refreshed early
  | "tincture"          // tinctures placed where they covered less than they could, or one not used
  | "pet-cut"           // a pet's set sequence cut short (Living Shadow)
  | "missed-followup"   // an action unlocked by another never pressed (Salt and Darkness)
  | "dance"             // a Dancer's dance finished short, or with wrong step presses
  | "ninjutsu"          // a Ninja's failed or weak ninjutsu (Rabbit Medium, Hyoton, Kassatsu misspent)
  | "blitz"             // a Monk's Blitz lost or wrong (Perfect Balance wasted, Celestial Revolution, Form Shift in uptime)
  | "wrong-gcd"         // a GCD that does less than the filler or nothing (Black Mage Fire I, Umbral Soul in uptime)
  | "movement";         // idle a mechanic's movement explains (DamageContext.movementWindows)

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
  // Movement a mechanic required (always forced too, so every "counted"
  // total leaves it out); summed apart as movementDamage.
  movement?:  boolean;
  cause?:     string;
  // The enemy it applies to (analyze.ts targetAround, or the check's own
  // hit): the dialog shows "on Chaos".
  target?:    string;
  basis:      string;    // how lostDamage was estimated
  detail:     string;    // one line for the dialog
  // Short and pull-independent ("Technical Step", "gap during Limit Cut"):
  // the same label in two pulls is the same recurring finding.
  label:      string;
  inference?: boolean;   // rests on inference rather than a measured value
  // A rate over the whole pull (GCD pace): no moment to mark, so the
  // dialog's timeline strip leaves it off (its span would paint the pull).
  pullWide?:  boolean;
  // A sub-second GCD delay (checks.ts checkGcdGaps): the timeline draws it
  // as a thin line under the GCD blocks, a gap as a red overlay on them.
  minor?:     boolean;
  // GCD delay / drift / clipping: the idle it counts (forced: the forced
  // idle), for the dialog's per-category time.
  delayMs?:   number;
  // A summary over separate moments (small GCD delays, early DoT refreshes,
  // missed positionals): when each happened, and what that one was and
  // cost. The dialog's strip marks these instead of the whole startMs–endMs
  // span, which can cover the pull, and its tooltip describes just the one.
  moments?:   Moment[];
  // Where a timed use would go instead (a tincture moved to cover the raid
  // buffs): drawn as a dashed box on the timeline, the played one at fromMs.
  proposals?: { fromMs?: number; atMs: number; durationMs: number }[];
};

export type Moment = Window & { detail?: string; lostDamage?: number };

// A tincture / potion as played, named by the item when the log says.
export type PotWindow = Window & { name?: string; icon?: string };

// One GCD on the dialog's timeline: when it started (the begin-cast for a
// hardcast), its lock at the player's speed then, and the off-GCD casts
// between it and the next GCD. Icons are the log's resolved URLs.
export type TimelineGcd = {
  startMs: number;
  castMs:  number;
  lockMs:  number;
  name:    string;
  icon?:   string;
  heal:    boolean;
  weaves:  { atMs: number; name: string; icon?: string }[];
};

// One player's fitted press pace (WoW, lib/damage/pace.ts): the base GCD
// from back-to-back instants with no haste buff up, and the haste the rating
// gives on that pull (rating ÷ the pull's calibration), so two players' bases
// compare after the rating difference is taken out.
export type PacePeer = {
  player:       string;
  job:          string;
  baseMs:       number;
  ratingHaste?: number;    // fraction (0.28 = 28%)
  source?:      string;    // a reference clear's label; undefined = this pull
};

type Window = { startMs: number; endMs: number };

// ── Analysis output ────────────────────────────────────────────────────

export type PlayerDamageSummary = {
  player:        string;
  job:           string;
  role:          string;
  damage:        number;     // dealt in the analysed window
  lostDamage:    number;     // unforced findings
  forcedDamage:  number;     // forced findings, movement left out
  movementDamage: number;    // movement findings
  gcds:          number;
  baseGcdMs:     number;     // the player's observed GCD
  // The fitted press pace, for comparing same-spec players across pulls
  // (lib/damage/pace.ts); only for players whose base came from instants.
  pace?:         PacePeer;
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
    // Each GCD with what was woven after it, for the timeline's hover.
    gcds:        TimelineGcd[];
    buffWindows: { startMs: number; endMs: number }[];
    forced:      ForcedWindow[];
    movement:    ForcedWindow[];   // DamageContext.movementWindows for this player
    // Job gauges simulated from casts (Sage's Addersgall), for display.
    gauges?:     GaugeTrack[];
    // Tincture / potion windows as played (DamageGame.potWindows).
    potWindows?: PotWindow[];
    // Each raid buff (or party debuff on a boss) by name, for the hover;
    // buffWindows is their merged union.
    raidBuffs:   { startMs: number; endMs: number; name: string; source?: string; icon?: string }[];
  };
};

export type GaugeTrack = {
  name:   string;
  max:    number;
  // The value from each t until the next step.
  steps:  { t: number; value: number }[];
  // Stretches at the cap with the generation timer stopped.
  capped: { startMs: number; endMs: number }[];
  note:   string;     // one line: what was lost, how it's simulated
  // Named moments drawn as ticks on the lane (AST: each card played, and
  // each one a Draw replaced unplayed as "lost").
  marks?: { t: number; label: string; tone: "use" | "lost" }[];
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
  // The game patch the pull was played on (DamageGame.patchOf), when known:
  // the rules patch-specific checks applied.
  patch?:        string;
  // The level the encounter syncs to (DamageGame.levelOf), below the cap:
  // checks that need a later kit weren't judged.
  level?:        number;
  // Data the pull lacks (fetched before it existed). Re-fetching is the
  // user's call.
  missingData:   string[];
  raidDowntime:  ForcedWindow[];
  players:       PlayerDamageSummary[];
  phases:        PhaseDamageSummary[];
};
