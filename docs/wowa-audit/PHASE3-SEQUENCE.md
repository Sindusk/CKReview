# WoWAnalyzer audit: phase 3, one spec at a time

The process the user set on 2026-10-17 for phase 3 of every remaining
spec. The method itself is in [../wowa-audit-plan.md](../wowa-audit-plan.md),
phase 3. This file holds the process, the order and where each spec
stands; the main session keeps the status table current.

## The process

1. The main session sends **one subagent** (Opus 5.5) for the next spec
   in the table, with the prompt below. Never two at once: the user's
   plan has a session usage cap.
2. The agent verifies the spec's ledger against real logs, builds the
   checks worth building, and commits each one (standing authorization)
   once `npx tsc --noEmit` and the scoped `validate.js --check` pass. It
   finds its own logs with `scripts/wow-rankings.js` and
   `scripts/wow-probe.js` (docs/dev-tooling.md).
3. It reports back. The main session **verifies the claims**:
   - re-runs each new check on one top and one weak kill, and confirms
     the numbers the report quotes;
   - reads the ledger edits against the status rules and the licence;
   - fixes or reverts what doesn't hold, and commits.
4. Then the next spec. The user isn't asked between specs (user,
   2026-10-17), except about something only they can decide; each spec
   gets a short summary to the user as it finishes.
5. When every spec has had its pass, the user reviews the `wrong` and
   `no-damage` rows spec by spec (wowa-audit-plan.md, phase 3). Questions
   held for that review are listed at the bottom.

A pass that runs out of room writes a "Phase 3 handoff" bullet at the top
of its ledger (what's measured, built, left) and commits it; the next
agent for that spec resumes from it.

## Order

The plan's order. Elemental is done. Healers and tanks get a short pass:
most of their rows are healing or mitigation (`no-damage`), so only their
damage rows are measured.

| # | Spec | Ledger | Status |
|---|---|---|---|
| 1 | Windwalker | [monk-windwalker.md](monk-windwalker.md) | done 2026-10-17: Fists of Fury held, Zenith Stomp unused (windwalker.ts); verified by the main session |
| 2 | Havoc | [demonhunter-havoc.md](demonhunter-havoc.md) | done 2026-10-17: Eye Beam held, Death Sweep reset unused (havoc.ts); Reaver's Glaive added as a GCD press (game.ts); verified by the main session |
| 3 | Arcane | [mage-arcane.md](mage-arcane.md) | done 2026-10-17: Touch of the Magi window (arcane.ts; `burstGcdFindings` takes a `windows()` override); verified by the main session |
| 3a | Engine: WoW proc expiries | 18 ledgers cite `checkProcs` | `checkProcs` never fired on WoW (no buff durations in the log; confirmed on LckJC7GMhQvD6rdw: 0 of 36,543 buff events carry one). Done 2026-10-17: measured durations for ten procs (lib/damage/wow/procs.ts, `DamageGame.measuredProcs`); Windwalker, Elemental and Arcane proc rows rechecked |
| 4 | Demonology | [warlock-demonology.md](warlock-demonology.md) | done 2026-10-17: Implosion held (the phase-2 `wrong` overturned: To Hell and Back), Call Dreadstalkers held (demonology.ts); verified by the main session |
| 5 | Affliction | [warlock-affliction.md](warlock-affliction.md) | |
| 6 | Arms | [warrior-arms.md](warrior-arms.md) | |
| 7 | Preservation | [evoker-preservation.md](evoker-preservation.md) | |
| 8 | Mistweaver | [monk-mistweaver.md](monk-mistweaver.md) | |
| 9 | Restoration Druid | [druid-restoration.md](druid-restoration.md) | |
| 10 | Restoration Shaman | [shaman-restoration.md](shaman-restoration.md) | |
| 11 | Beast Mastery | [hunter-beastmastery.md](hunter-beastmastery.md) | |
| 12 | Balance | [druid-balance.md](druid-balance.md) | |
| 13 | Retribution | [paladin-retribution.md](paladin-retribution.md) | |
| 14 | Frost DK | [deathknight-frost.md](deathknight-frost.md) | |
| 15 | Vengeance | [demonhunter-vengeance.md](demonhunter-vengeance.md) | |
| 16 | Guardian | [druid-guardian.md](druid-guardian.md) | |
| 17 | Assassination | [rogue-assassination.md](rogue-assassination.md) | |
| 18 | Marksmanship | [hunter-marksmanship.md](hunter-marksmanship.md) | |
| 19 | Feral | [druid-feral.md](druid-feral.md) | |
| 20 | Augmentation | [evoker-augmentation.md](evoker-augmentation.md) | |
| 21 | Devastation | [evoker-devastation.md](evoker-devastation.md) | |
| 22 | Brewmaster | [monk-brewmaster.md](monk-brewmaster.md) | |
| 23 | Shadow | [priest-shadow.md](priest-shadow.md) | |
| 24 | Subtlety | [rogue-subtlety.md](rogue-subtlety.md) | |
| 25 | Enhancement | [shaman-enhancement.md](shaman-enhancement.md) | |
| 26 | Destruction | [warlock-destruction.md](warlock-destruction.md) | |
| 27 | Fury | [warrior-fury.md](warrior-fury.md) | |
| 28 | Blood | [deathknight-blood.md](deathknight-blood.md) | |
| 29 | Unholy | [deathknight-unholy.md](deathknight-unholy.md) | |
| 30 | Devourer | [demonhunter-devourer.md](demonhunter-devourer.md) | |
| 31 | Survival | [hunter-survival.md](hunter-survival.md) | |
| 32 | Fire | [mage-fire.md](mage-fire.md) | |
| 33 | Frost Mage | [mage-frost.md](mage-frost.md) | |
| 34 | Holy Paladin | [paladin-holy.md](paladin-holy.md) | |
| 35 | Discipline | [priest-discipline.md](priest-discipline.md) | |
| 36 | Holy Priest | [priest-holy.md](priest-holy.md) | |
| 37 | Outlaw | [rogue-outlaw.md](rogue-outlaw.md) | |
| 38 | Protection Warrior | [warrior-protection.md](warrior-protection.md) | |
| 39 | Protection Paladin | [paladin-protection.md](paladin-protection.md) | |

## The agent prompt

Fill in `<spec>`, `<ledger>` and anything the main session has already
measured for it.

> You are running phase 3 of the WoWAnalyzer audit for **<spec>** in the
> repo at C:\Users\sinis\Documents\WoW\VoD Coding. Its ledger is
> docs/wowa-audit/<ledger>. Work only on WoW (`--game wow`), and only on
> this spec.
>
> **Read first, in full:** CLAUDE.md; docs/wowa-audit-plan.md (licence,
> statuses, phase 3); docs/wowa-audit/PHASE3-SEQUENCE.md (this process);
> the ledger; docs/wowa-audit/HANDOFF-elemental-build.md, "Lessons from
> the Elemental build", and this file's "Lessons from earlier passes";
> docs/dps-analysis.md, "Analyzing a WoW kill";
> the header of lib/damage/wow/specs/elemental.ts (the model for how a
> built check is documented); the spec's role file in
> lib/damage/wow/specs/ and the headers of shared.ts, potion.ts,
> tracked-cooldowns.ts and lib/damage/checks.ts.
>
> **Job:**
> 1. Talent check: read each sample player's talents from CombatantInfo
>    (the raw pull file keeps it) or infer them from casts and buffs. A
>    rule for a talent the player didn't take is skipped on that pull.
> 2. For every `candidate` row: value it as damage lost in the log
>    (procs, pets, DoTs included), and ask what it costs later in the
>    fight (a cooldown pushed out of a window, a charge or resource
>    missing when it's needed, a buff due again sooner). Premise check on
>    3+ top kills (`node scripts/wow-rankings.js "<boss>" "<spec>"
>    --from-pct 99`); firing check on weaker kills (`--from-pct 20`).
>    Probe before fetching (`scripts/wow-probe.js`, a few points), then
>    fetch only the one fight (`node scripts/fetch-wow-report.js <code>
>    --fight <id>`). Use the Venomous Abyss bosses on Mythic. Keep under
>    half the hour's WCL points; wait for the reset rather than overrun.
> 3. **Build every candidate whose measured loss is real and that doesn't
>    fire on the top players** (or fires there and matches a real, common
>    loss). Put the spec's checks in their own file under
>    lib/damage/wow/specs/ the way elemental.ts does, with a header that
>    holds each model and its measurements, wired from the role file.
>    Spell ids come from the logs' masterData, never from WoWAnalyzer.
>    Leave a candidate unbuilt, with its numbers, when the loss is
>    negligible.
> 4. **Re-check every `wrong` row.** Assume the fan-out may have been
>    wrong: test its premise in the log. If the rule turns out to be
>    reasonable, make it a candidate and treat it as one. If you can't
>    verify either way, leave it `wrong` and write in its notes what you
>    checked.
> 5. `no-damage` rows: don't measure them unless a row hides a damage
>    effect (Elemental's Overcharge did). Don't ask the user about any
>    `wrong` or `no-damage` row: the review comes after every spec is
>    done. Write the evidence into the row's notes instead.
> 6. Update the ledger (statuses, notes, a "Phase 3" bullet in the
>    header), the role file's header, and the spec's pointer line in
>    docs/open-items.md.
>
> **Rules:** WoWAnalyzer is AGPL, reference only: clone it read-only
> into the scratchpad if you need it (`git clone --depth 50 --branch
> midnight https://github.com/WoWAnalyzer/WoWAnalyzer.git`, checkout
> 0ffe84575780ee3d3fae9ef29f0791dd135d0fc9); never copy code, comments,
> tables, constants or ids; describe rules in your own words. Scratch
> measuring scripts go in sampledata/wow/_scratch/ (gitignored), loading
> pulls through scripts/lib/load-sample-pull.js. Before each commit:
> `npx tsc --noEmit` and `node scripts/validate.js --check` scoped to
> the sampledata/wow folders you used. Commit and push each check
> (`git push CKReview main`), ending the message with a blank line and
> `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't
> deploy. Edit tracked files with the Edit and Write tools, not sed or
> redirects (a hook blocks shell writes to source files). Never weaken
> or delete an existing check without measuring it.
>
> If you run out of room, write a "Phase 3 handoff" bullet at the top of
> the ledger (measured, built, left), commit it, and say so.
>
> **Report back** (under 400 words): each check built, with its commit,
> what it flags, the loss model, and its numbers on the top and weak
> kills (report code, fight, player, MM:SS of one example); each row
> whose status changed and why; the logs fetched; anything only the user
> can decide.

## Lessons from earlier passes (passed to every agent)

- **A cooldown the server cuts can still be rebuilt from the log**
  (Windwalker's Fists of Fury): base ÷ haste from rating, rate changes
  from buffs, flat cuts from casts and crit hits. Check the direction of
  its error on top players: their casts should come at or *before* the
  rebuilt ready time (lenient), never after it by habit.
- **Check which resource the shared cap check reads** before calling a
  resource-waste row `covered`: `primaryResourceCapFindings` picks the
  resource the player's casts log most (Energy, not Chi, for Windwalker).
- **Price held time by the player's average recharge**, not the cycle's
  own: a burst cycle can be 3–4s long and would price one second at a
  third of a cast.
- **Holding a button into a burst can pay**: excuse a hold that ends early
  in the window up to its break-even (the button's damage inside minus
  outside, against a held second's value), never past one recharge.
- **Forced time explains much of WoWAnalyzer's efficiency gap**
  (Vitriolic Stasis): measure outside it before calling a loss real.
- **Check the spell survey for the spec's hero-talent presses.** Havoc's
  Reaver's Glaive wasn't in it, so every press read as an idle GCD and
  doubled the top players' GCD delays. If the top players' delays look
  high, list the casts that precede the "idle" gaps.
- **Fit a cooldown to the log before trusting a modelled cut.** Havoc's
  Eye Beam sat at exactly 20.0s whatever the spender count, so the
  per-spender cut WoWAnalyzer models wasn't there.
- **A trial check that fires on the top players about as much as on the
  weak ones is dropped**, with its numbers in the ledger (Havoc's Essence
  Break window).
- **Don't trust a "covered" row until the covering check has fired on a
  WoW pull.** Arcane found `checkProcs` had never produced a WoW expiry.
  Run the app's findings (`validate.js damage-analysis-wow <folder>
  --all-findings`) and look for the label.
- **`checkProcs` fires on WoW only for the procs in
  lib/damage/wow/procs.ts** (2026-10-17): Combo Breaker, Rushing Wind
  Kick, Dance of Chi-Ji, Killing Machine, Sudden Death, Demonic Core,
  Infernal Bolt, Lock and Load, Divine Purpose, Storm Unleashed. A row
  marked "covered by `checkProcs` (expiries)" for any other proc is
  uncovered until you measure its duration (gain → removal spans at one
  whole second with a consumer nowhere near, from a log where it runs
  out: `_scratch/proc-durs.js`, `proc-expiries.js`) and add it there with
  its consumers. Read its findings as "<proc> expired unused", valued at
  a whole consumer press (an upper bound). For a proc that only empowers
  a press (Killing Machine, Dance of Chi-Ji, Precise Shots, Umbral
  Embrace), the spec's pass values it: the press with the proc minus
  without, measured in the log, as a priced override. Check the top players first: a
  proc that runs out on most of them isn't a loss (Lava Surge did).
- **A phase-2 `wrong` can hide the spec's biggest loss.** Demonology's
  Implosion was `wrong` ("imps are worth more kept"); with To Hell and
  Back each press returns 0.24–0.78M of imps. Read the talent that
  changes the rule before accepting the premise.
- **Pets copy or extend a press under their own names** ("Wild Imp
  (Inner Demons/To Hell and Back)"): value a press by the pet damage in
  the seconds after it against the pet's baseline rate.
- **Value a hit by its own events, not a total divided by presses**
  (Arcane Orb: 294k claimed, 47–63k a pressed Orb).
- **Class resources not in the fetch** (Arcane Charges) make a rule
  `unverifiable` until the fetch carries resource events; say so in the
  row.

## Held for the user's review

- Windwalker (2026-10-17): the two `wrong` rows kept after the re-check
  (filler order, Celestial Conduit targets) and the Unity Within half of
  the Heart of the Jade Serpent window grade, evidence in
  [monk-windwalker.md](monk-windwalker.md). Also an unvalued lead outside
  any WoWAnalyzer rule: Blkphnx casts 4.9 paid Blackout Kicks a minute
  against the top players' 1.0–3.0.
- Havoc (2026-10-17): `BladeDance/low-target` and the two Inertia window
  rows kept `wrong` (every sample player takes First Blood; nobody takes
  Inertia), evidence in [demonhunter-havoc.md](demonhunter-havoc.md).
  Open, not a decision: Blade Dance / Death Sweep presses (9.5 per
  unforced minute against the top players' 10.8–12.7) is the largest
  unpriced Havoc loss; its cooldown couldn't be rebuilt from the log.
- Arcane (2026-10-17): proposed `wrong` for the Barrage tier rows
  (`sunfury-perfect`, `good-tier`, `ok-tier`), `ArcaneMissiles/ok-tier`
  and `CastEfficiency/arcane-orb`, plus the re-checked `wrong` rows
  (`surge-ready-soon` and others), evidence in
  [mage-arcane.md](mage-arcane.md). Open: Arcane Charges aren't fetched,
  so the charge-count rules can't be checked; fetching resource events
  would settle them.
- Demonology (2026-10-17): Implosion held reads 2.24M on the 99.9th
  Lydd on Vashnik (VbAHWZDdPwJBajmx: 14 presses in 6:35, against 18 and 22
  for two other top Vashnik players; WoWAnalyzer flags him too). Does
  Vashnik need an exception? No Vashnik-specific reason was found.
  Evidence in [warlock-demonology.md](warlock-demonology.md).

- Elemental (2026-10-17): `CallOfTheAncestors/other-checks`,
  `statistics` (and whether "Stormkeeper before Ascendance" should be
  measured), `shaman-shared/utility`: all proposed `no-damage`, evidence
  in [HANDOFF-elemental-build.md](HANDOFF-elemental-build.md).
- core.md: consumables and gear at the pull (flask, food, rune, enchants,
  gems): out of scope? Marked `no-damage` for now.
