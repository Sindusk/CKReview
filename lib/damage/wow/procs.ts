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
//   Moved to specs/frostdk.ts (Frost DK phase 3, 2026-10-17): it empowers
//   an Obliterate (81–118k with it, 22–44k without), so a lost one is
//   worth the difference, and checkProcs priced it at the hits logged
//   under Obliterate's cast id (0–63k). The duration above is used there,
//   with Empower Rune Weapon pressed at two stacks as the other way to lose
//   one.
// - Sudden Death 12s: 15 at D (7 reports), max 12.01s of 1118. Arms spends
//   it with Execute 281000; Fury with 5308 or 280735.
// - Demonic Core 20s: 7 at D (3 reports), max 20.01s of 681.
// - Infernal Bolt 20s: 7 at D, all Fwîî (gVDPhzp61Zm29HMw), max 20.02s.
// - Lock and Load 15s: 3 at D (2 reports), max 15.02s of 369.
// - Divine Purpose 12s: 7 at D (2 reports), max 12.02s of 1441. Spent by
//   Final Verdict or Divine Storm.
// - Storm Unleashed 20s: 2 at D (gVDPhzp61Zm29HMw, v8bmgMAdcnBCj9Ya; three
//   Enhancement players on the samples), max 20.02s of 78.
// - Nightfall 12s (Affliction; added in its phase 3, 2026-10-17): 14 at D
//   on 18 Affliction player-pulls, max 12.03s of 424; stacks to 2. Spent
//   by Shadow Bolt, Drain Soul or Malefic Grasp. It empowers the press
//   (Shadow Bolt with it 45–101k vs 37–59k without; Drain Soul 119–163k vs
//   60–86k), so the whole consumer press is an upper bound. Unused
//   expiries: the static's Wyrmtongues 12 in 9 pulls (gVDPhzp61Zm29HMw,
//   3 of them in forced time), Fluffalicous 2 and Pigson 1
//   (a4kX1DNT27yHGvqJ), Zachx 1 (Kag91qVZ2YJ7MQAb, 98.9th), the other six
//   players none.
// - Gore 10s (Guardian; added in its phase 3, 2026-10-17): a Mangle reset
//   from Thrash (22–27% of casts), Swipe (21%) and Maul (5–18%). 4 at D on
//   27 Guardian player-pulls (10.00–10.03s, gained at: 주황양배추
//   aZ6NnwL8g9PdpGJ1 0:45, Mêrùem LCFp3wbHvQqNP4my 4:16, Diggersby
//   gVDPhzp61Zm29HMw Entombed Sentinels Pull 1 0:45 and Ula'tek 5:28), max
//   10.03s of 691; every other removal is beside a Mangle. Worth one Mangle
//   (47–50k own hits).
// - Moonlight Chakram 17s (Marksmanship, Sentinel; added in its phase 3,
//   2026-10-17): each Trueshot grants the buff (1264946), and the press
//   (1264949) is only possible while it's up: 108–120s between presses on
//   every player, one 10–15s after each Trueshot. 11 at D on 61 MM
//   player-pulls (16.99–17.03s), max 17.03s of 178; every other removal is
//   beside the press or a new Trueshot. Run out: Storcken
//   (6qVxPcBdCgXrkG8a, Entombed Sentinels 2:25), Teinaras
//   (8AFnLQKdrcgawzDC 0:22), Válï ×2 and Shadhunt (LCFp3wbHvQqNP4my),
//   丶郑兮 (VbAHWZDdPwJBajmx 4:35), Aaragondelta (a4kX1DNT27yHGvqJ 4:32),
//   Pazsmilkies ×2 (wWx8B1GPZMLghAyz), 非常人贩 (J3ckBVtrZNfWv1h7),
//   Braktixx (xN9cWhzbvqTVfrG8, 2s before the kill); none on the
//   99th-percentile and better players (Qenjua, Traviexx, Leevilh,
//   Taewoos, Tdyipce). Worth a whole Chakram: its hits (1266081, matched
//   by name) are 0.3–1.4M a press, against a GCD of ~0.25M.
// - Clearcasting 15s and Apex Predator's Craving 15s (Feral; added in its
//   phase 3, 2026-10-17, 14 player-pulls of 13 players). Clearcasting
//   (135700) makes the next Shred or Swipe free: 754 of 892 removals
//   beside a Shred, 129 a Swipe; 4 at D (15.02–15.03s), all on the weaker
//   players (Cheezywizzy ZvrLTQfk1zbAXMwB 0:50, 2:40, 4:03; Tyger
//   RwxWC6PF2pJ7Zd9H 0:58), max 15.03s of 683. Worth a whole Shred (its
//   40 Energy). Apex Predator's Craving (391882) is a free Ferocious Bite
//   (Ravage 441591 for Druid of the Claw): 165 removals beside a Bite, 7 a
//   Ravage; 3 at D (14.99–15.02s: Scaricat 6Bpq1FmA9aH4WQxc 2:50 and 4:39,
//   Cheezywizzy 0:49), max 15.02s of 175. Worth a whole Bite.
//   Not added: Sudden Ambush (1244483) has no duration in the samples
//   (longest spans 5.0–7.3s, one 13.6s; its 43 press-less removals come
//   0.2–3.4s after the gain); Predatory Swiftness (12s) is a free heal.
// - Essence Burst 15s (Devastation; added in its phase 3, 2026-10-17, 19
//   player-pulls): makes the next Disintegrate or Pyre free. 557
//   removals of 753 gains, 6 with no consumer beside them, 2 at D (15.00,
//   15.01s: Millzd NvX17Tb9yMY8QrDf 4:26 in Stasis, Qiyue
//   VbAHWZDdPwJBajmx 6:16 after he stopped casting at 5:59); the next
//   longest are 13.99s and under, each beside a Disintegrate. Worth a whole
//   Disintegrate here (an upper bound: what it saved is 3 Essence, a
//   Disintegrate over a Living Flame). Measured for Devastation and left
//   out: Burnout 15s (28 at D on 14 of 19 players, top ones too; it makes a
//   Living Flame instant, see below), Imminent Destruction 30s (42 at D on
//   15 of 19, every top player 2–4 times a pull: a timed buff whose stacks
//   lapse, not a proc), Mass Disintegrate 15s (2 at D; it widens a
//   Disintegrate, a whole one overstates it), Leaping Flames (no duration:
//   unused spans 6–41s), Unbound Flame (1 unused in 21 gains).
// - Stormsurge 12s (Enhancement; added in its phase 3, 2026-10-17, 23
//   player-pulls): a Stormstrike reset (201846), spent by Stormstrike or
//   Windstrike. 1,102 gains; run out with no consumer beside it, 12.0s
//   after the last gain (max span 12.03s): Macroos LCFp3wbHvQqNP4my 4
//   (2:30, 4:10, 5:09, 6:00), Cocroach gVDPhzp61Zm29HMw 1–2 on three
//   pulls, Vanilla v8bmgMAdcnBCj9Ya 2, Tolu, Zóhrg, Ripzug, Toranha, Thaw,
//   Throttnuk 1 each; none on the four top players. Worth a whole
//   Stormstrike (36–50k with the off-hand; an upper bound). Its 6–21
//   refreshes a pull come within 1s of the gain (two resets at once) on
//   every player, top included: not a loss.
// - Fingers of Frost 15s (Frost Mage; added in its phase 3, 2026-10-17, 21
//   player-pulls): spent by Ice Lance, two stacks. 2 at D (14.97s Voxdeii
//   p4G1xa2yMqCDznZT 1:08, 15.00s Supertitis X618LRt7hPqzbVJj 1:38), max
//   15.00s of ~1,400 gains; the next longest span is 13.67s, ending at an
//   Ice Lance. Every other removal is beside an Ice Lance. Worth an Ice
//   Lance's own hits here (an under-count: its Shatter isn't matched by
//   name). A gain at two stacks loses one too: specs/frostmage.ts
//   "Fingers of Frost wasted".
//
// ── Measured and left out ──────────────────────────────────────────────
// - Lava Surge (77762) 10s, clean, but 75 of 657 run out on the top
//   players, 19 of 27 of them: a reset the spec lets go when Lava Burst
//   is already ready, not a loss.
// - Umbral Embrace (393763) 15s: 6 of 10 top Balance players let one run
//   out (7/167), the static 14 of 19 pulls; and it empowers a Wrath or
//   Starfire, so a whole Starfire would overstate it. Settled in the
//   Balance pass (2026-10-17, 50 player-pulls): a Starfire with it does
//   +3k outside Eclipse, +61k in Eclipse, +98k in Incarnation (medians of
//   the players' own with − without), and it runs out 0–4 times a pull on
//   the top players (Painseekerr, Новеон 4) as on the weak (Sylmigron
//   0–3): at most ~0.2M a pull on anyone, top included. Not added.
// - Starweaver's Warp (393942) / Weft (393944) and Touch the Cosmos
//   (450360), the free spenders: 1, 5 and 3 removals without a consumer in
//   1,258 on the 50 Balance player-pulls (Jugular's Weft at 30.0s, a
//   Touch the Cosmos at 15.0s in forced time). Not added.
// - Crimson Scourge (81141) 15s: 9 of 18 top Blood players let one run
//   out (12/349). A free Death and Decay on a tank. Settled in the Blood
//   pass (2026-10-17): judged in specs/blood.ts by the time it's held with
//   no Death and Decay on the ground ("Free Death and Decay held"), which
//   separates top from weak; expiries alone don't, and a whole Death and
//   Decay less its GCD is worth ~0 for many players.
// - Burnout (375802) 15s and Backdraft (117828) 10s: they cut a cast time
//   rather than grant a press, so a whole Living Flame or Chaos Bolt isn't
//   their price (Destruction's Backdraft has its own check).
// - Precise Shots (260242) 15s: empowers an Arcane Shot; a whole Arcane
//   Shot would overstate it. For the Marksmanship pass.
// - Rime (59052): never runs out (0 of 1,347 gains on the 31 Frost DK
//   player-pulls, max span 14.4s), so no duration. Its loss is the
//   overwrite: specs/frostdk.ts "Rime overwritten".
// - Sudden Doom (81340) 10s (Unholy phase 3, 2026-10-17, 31 player-pulls):
//   4 removals with no coil at 10.00–10.06s, max span 10.06s of 1,585. Not
//   listed here: it empowers a coil (Necrotic Coil +75–100k, Death Coil
//   +10–25k) rather than granting one, its removal lands up to ~0.35s after
//   the coil (past PROC_CONSUME_MS), and gains at two stacks lose one too, so
//   specs/unholy.ts "Sudden Doom lost" judges it. Reaping (1242654, 30s, a
//   Soul Reaper per Dark Transformation) is measured there and worth ~0.
//   Blightfall's ready buff (1271975) never runs out (held up to 44s).
// - Voidstep (1223157, Devourer's Void-Scarred) 6.0s (phase 3, 2026-10-17,
//   9 player-pulls): spent by Vengeful Retreat, but worth ~14k a use (its
//   Voidstep hit, 1239526: Influka PYaN4FW3VXKDThmL 321k over 23), and the
//   100th-percentile Limofans (VbAHWZDdPwJBajmx) lets all 22 run out
//   (闹米的揪揪 18 of 20, Felstalker 7 of 19). Not added.
// - Eradicate (1239524, Devourer): never runs out (1,287 removals on 40
//   player-pulls, each beside its hit, a 0.02s flicker or a Void
//   Metamorphosis transition); its loss is the overwrite, in
//   specs/devourer.ts. Its press isn't logged (game.ts devourerUnlogged).
// - No duration in the samples (no clean cluster, or never run out):
//   Brain Freeze (Frost Mage phase 3: 0 of ~600 removals on 21
//   player-pulls without a Flurry beside them, held up to 26.0s),
//   Galactic Guardian (0 of 85 removals unconsumed on the three Guardians
//   who take it, J3ckBVtrZNfWv1h7, JvQpZk3CXj78Dx2f, LCFp3wbHvQqNP4my;
//   max span 12.75s), Prismatic Bolt!, Tempest, Art of War. Power of the
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
// it) and Veinglas's Killing Machine (3; frostdk.ts's since 2026-10-17). The lost value is checkProcs'
// upper bound, the consumer's average press (hits matched by name: Execute,
// Obliterate and Rushing Wind Kick hit under other ids than their casts).

import type { MeasuredProc } from "../types";

export const WOW_MEASURED_PROCS = new Map<number, MeasuredProc>([
  [116768,  { durationMs: 15_000, consumerIds: [100784] }],                       // Blackout Kick! (Combo Breaker) → Blackout Kick
  [1250554, { durationMs: 15_000, consumerIds: [467307] }],                       // Rushing Wind Kick
  [325202,  { durationMs: 15_000, consumerIds: [101546] }],                       // Dance of Chi-Ji → Spinning Crane Kick
  [52437,   { durationMs: 12_000, consumerIds: [281000, 163201, 5308, 280735] }], // Sudden Death → Execute
  [264173,  { durationMs: 20_000, consumerIds: [264178] }],                       // Demonic Core → Demonbolt
  [433891,  { durationMs: 20_000, consumerIds: [434506] }],                       // Infernal Bolt
  [194594,  { durationMs: 15_000, consumerIds: [19434] }],                        // Lock and Load → Aimed Shot
  [408458,  { durationMs: 12_000, consumerIds: [383328, 53385] }],                // Divine Purpose → Final Verdict, Divine Storm
  [1262830, { durationMs: 20_000, consumerIds: [187874] }],                       // Storm Unleashed → Crash Lightning
  [264571,  { durationMs: 12_000, consumerIds: [686, 198590, 1261153] }],         // Nightfall → Shadow Bolt, Drain Soul, Malefic Grasp
  [93622,   { durationMs: 10_000, consumerIds: [33917] }],                        // Gore → Mangle
  [1264946, { durationMs: 17_000, consumerIds: [1264949] }],                      // Moonlight Chakram (from Trueshot) → Moonlight Chakram
  [135700,  { durationMs: 15_000, consumerIds: [5221, 106785] }],                 // Clearcasting (Feral) → Shred, Swipe
  [391882,  { durationMs: 15_000, consumerIds: [22568, 441591] }],                // Apex Predator's Craving → Ferocious Bite, Ravage
  [359618,  { durationMs: 15_000, consumerIds: [356995, 357211] }],               // Essence Burst → Disintegrate, Pyre
  [201846,  { durationMs: 12_000, consumerIds: [17364, 115356] }],                // Stormsurge → Stormstrike, Windstrike
  [44544,   { durationMs: 15_000, consumerIds: [30455] }],                        // Fingers of Frost → Ice Lance
]);
