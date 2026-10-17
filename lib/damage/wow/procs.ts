// lib/damage/wow/procs.ts
//
// The procs checkProcs (lib/damage/checks.ts) can see run out on a WoW
// pull, with each one's natural duration (DamageGame.measuredProcs).
// Built 2026-10-17 as step 3a of the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/PHASE3-SEQUENCE.md).
//
// ── Why a table ────────────────────────────────────────────────────────
// checkProcs finds an expiry as a removal at applied + duration with no
// consumer beside it. FFLogs buff events carry the duration; Warcraft Logs
// events don't (LckJC7GMhQvD6rdw: 0 of 36,543), so no WoW proc had ever
// expired in the app. The duration has to come from the log's own spans.
// Inferring it per pull was measured and rejected:
// - a proc that expires once in a pull gives one span, and taking that
//   span as the duration makes every unused removal an expiry;
// - the sample-wide upper cluster of spans (two or more within 150ms,
//   nothing above) gave a clean whole-second value for about a third of
//   the consumed procs; the rest sit on coincidental consumption spans
//   (Dance of Chi-Ji 6.0s ×3 with six spans above it), or have none at all
//   because the top players never let them run out;
// - the generic consumer inference also takes timed buffs for procs when a
//   press follows them often (Embrace of Pa'ku and Divine Steed "consumed"
//   by Crusading Strikes, which logs a cast per swing; Shadowform by Power
//   Infusion), and a duration would make their natural ends "expiries".
// So a proc expires only if it's listed here, with a duration measured
// from our logs (never from WoWAnalyzer, which is AGPL) and its consumers
// declared: a weaker player who lets half their procs run out fails the
// generic 60%-consumed inference, exactly when the check matters.
//
// ── The timer, measured ────────────────────────────────────────────────
// A gain restarts it: applied, a stack gained, or a "refreshed" that
// re-procs a held one (Elevatedhota JvQpZk3CXj78Dx2f, Blackout Kick!
// refreshed at 2:26.8, removed 15.0s later). The "refreshed" WCL logs at
// the same millisecond as a stackRemoved when one of two stacks is spent
// doesn't restart it: Ikissdudes (9w3bK4qhrRC82gVX, Vashnik) gained a
// second Blackout Kick! at 5:37.69, spent one at 5:38.69 (stackRemoved +
// refreshed), and the other ran out at 5:52.69, 15.0s after the gain
// (Neyha LckJC7GMhQvD6rdw, Tente v8bmgMAdcnBCj9Ya's Sudden Death and
// Happywarlock's four-stack Demonic Core the same). No refresh carried
// time over (no pandemic): of every listed proc's gain → removal spans,
// none ran past its duration by more than 50ms. All stacks go at once at
// the expiry (one removebuff), and each counts as a lost proc.
//
// ── Entries (spans from gain to removal, all 19 WoW sample reports) ────
// "at D" = spans within 50ms of the duration (every one is an unused
// expiry); "max" = the longest span of any.
// - Blackout Kick! (Combo Breaker) 15s: 14 at D across 7 reports, max
//   15.02s of 526.
// - Rushing Wind Kick 15s: 3 at D (9w3bK4qhrRC82gVX, gVDPhzp61Zm29HMw),
//   max 15.02s of 346.
// - Dance of Chi-Ji 15s: 1 at D (Leluu v8bmgMAdcnBCj9Ya, 6:27), max 15.00s
//   of 456. One expiry only; the next-longest spans (14.58, 14.01) end at a
//   Spinning Crane Kick.
// - Killing Machine 10s: 10 at D (3 reports), max 10.02s of 1754.
//   Consumers: Obliterate, Frostscythe, Exterminate (each beside removals).
// - Sudden Death 12s: 15 at D (7 reports), max 12.01s of 1118. Arms spends
//   it with Execute 281000; Fury with 5308 or 280735.
// - Demonic Core 20s: 7 at D (3 reports), max 20.01s of 681.
// - Infernal Bolt 20s: 7 at D, all Fwîî (gVDPhzp61Zm29HMw), max 20.02s.
// - Lock and Load 15s: 3 at D (2 reports), max 15.02s of 369.
// - Divine Purpose 12s: 7 at D (2 reports), max 12.02s of 1441. Spent by
//   Final Verdict or Divine Storm.
// - Storm Unleashed 20s: 2 at D (gVDPhzp61Zm29HMw, v8bmgMAdcnBCj9Ya; three
//   Enhancement players on the samples), max 20.02s of 78.
//
// ── Measured and left out ──────────────────────────────────────────────
// - Lava Surge (77762) 10s, clean, but 75 of 657 run out on the top
//   players, 19 of 27 of them: a reset the spec lets go when Lava Burst
//   is already ready, not a loss.
// - Umbral Embrace (393763) 15s: 6 of 10 top Balance players let one run
//   out (7/167), the static 14 of 19 pulls; and it empowers a Wrath or
//   Starfire, so a whole Starfire would overstate it. For the Balance pass.
// - Crimson Scourge (81141) 15s: 9 of 18 top Blood players let one run
//   out (12/349). A free Death and Decay on a tank; for the Blood pass.
// - Burnout (375802) 15s and Backdraft (117828) 10s: they cut a cast time
//   rather than grant a press, so a whole Living Flame or Chaos Bolt isn't
//   their price (Destruction's Backdraft has its own check).
// - Precise Shots (260242) 15s: empowers an Arcane Shot; a whole Arcane
//   Shot would overstate it. For the Marksmanship pass.
// - No duration in the samples (no clean cluster, or never run out):
//   Rime, Sudden Doom, Essence Burst, Fingers of Frost, Brain Freeze,
//   Galactic Guardian, Prismatic Bolt!, Tempest, Art of War. Power of the
//   Maelstrom loses stacks without a timer (Rakkt LckJC7GMhQvD6rdw: a
//   stack spent at 1:06.47 with no cast, the other 1.4s later), so no
//   duration fits it. A spec pass adds a row once a weaker log shows the
//   proc running out at one whole-second span.
//
// ── What it found (2026-10-17) ─────────────────────────────────────────
// Unforced "expired unused", top parses (16 reports): 11 findings, all
// small; Blackout Kick! the most (5, on 4 of 15 Windwalkers; Kreemoncow
// baRCnPv62YQ1dJZN 3:09, held through Zenith's setup and its first Fists
// of Fury). The static (gVDPhzp61Zm29HMw, wWx8B1GPZMLghAyz,
// qpZx3mWaG7gcDdYB): 18, led by Fwîî's Infernal Bolt (5 in 16 pulls, four
// of them at 1:55–2:00; Demonbolts and Hand of Gul'dan pressed through
// it) and Veinglas's Killing Machine (3). The lost value is checkProcs'
// upper bound, the consumer's average press (hits matched by name: Execute,
// Obliterate and Rushing Wind Kick hit under other ids than their casts).

import type { MeasuredProc } from "../types";

export const WOW_MEASURED_PROCS = new Map<number, MeasuredProc>([
  [116768,  { durationMs: 15_000, consumerIds: [100784] }],                       // Blackout Kick! (Combo Breaker) → Blackout Kick
  [1250554, { durationMs: 15_000, consumerIds: [467307] }],                       // Rushing Wind Kick
  [325202,  { durationMs: 15_000, consumerIds: [101546] }],                       // Dance of Chi-Ji → Spinning Crane Kick
  [51124,   { durationMs: 10_000, consumerIds: [49020, 207230, 441426] }],        // Killing Machine → Obliterate, Frostscythe, Exterminate
  [52437,   { durationMs: 12_000, consumerIds: [281000, 163201, 5308, 280735] }], // Sudden Death → Execute
  [264173,  { durationMs: 20_000, consumerIds: [264178] }],                       // Demonic Core → Demonbolt
  [433891,  { durationMs: 20_000, consumerIds: [434506] }],                       // Infernal Bolt
  [194594,  { durationMs: 15_000, consumerIds: [19434] }],                        // Lock and Load → Aimed Shot
  [408458,  { durationMs: 12_000, consumerIds: [383328, 53385] }],                // Divine Purpose → Final Verdict, Divine Storm
  [1262830, { durationMs: 20_000, consumerIds: [187874] }],                       // Storm Unleashed → Crash Lightning
]);
