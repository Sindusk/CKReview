# xivanalysis audit: Summoner

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/smn/` in the clone.
- **Patch:** one module branches: `MultiHitSkills.ts` (Tri-Disaster 3
  before 7.3, 4 from 7.3; Painflare 3 before 7.2, 4 for 7.2-7.4, 3 from 7.5).
  Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/caster.ts` (`SMN_CHECKS`: `searingLight`),
  `tracked-cooldowns.ts` ("Summoner"), generic checks. One sample:
  qjCMx4bRfgNKwX9T fight 16, where xivanalysis flagged nothing the app
  lacked ("nothing to build"). So the candidates below have no evidence in
  either direction yet.
- **xivanalysis bug found** (source-confirmed): `Slipstream.tsx:36-40`
  hooks cast events filtered by `statuses.SLIPSTREAM.id`, the status id,
  not the action's, so the cast count (and the missed-ticks rule) depends on
  the two ids happening to match.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| smn/SearingLight/searing-flash | verified | `searingLight` | no Searing Flash in Searing Light | Fight 16 10/10. |
| smn/SearingLight/players-buffed | covered | buffs.ts coverage | Searing Light missing a player | Display only. |
| smn/SearingLight/raid-buff-overwrite | no-damage | — | — | Note column. |
| smn/CooldownDowntime/demi-summons | verified | `checkCooldownDrift` | Bahamut / Phoenix / Solar Bahamut held | Fight 16 100%. |
| smn/CooldownDowntime/energy-drain | verified | `checkCooldownDrift` | Energy Drain / Siphon held | Fight 16 100%. |
| smn/CooldownDowntime/searing-light | verified | `checkCooldownDrift` | Searing Light held | Fight 16 100%. |
| smn/Summons/demi-gcds | covered | `checkGcdGaps` | under 6 GCDs in a demi summon | Minor 1, ... A missing demi GCD is idle time, which the gap check counts; not valued at the demi GCD's higher potency. |
| smn/Summons/window-table | superseded | `checkGcdGaps` | short egi attunements | Display only. Fight 16's short attunements were all forced (2:44, 3:01, 6:03, 14:11, 18:19). |
| smn/Summons/deathflare | candidate | — | a Bahamut window without Deathflare | Major. A lost oGCD; log-visible. No end-of-pull allowance in xivanalysis. |
| smn/Summons/enkindle | candidate | — | a demi window without Enkindle | Major. Same. |
| smn/Summons/rekindle | no-damage | — | a Phoenix window without Rekindle | Minor. A heal. |
| smn/Summons/mountain-buster | candidate | — | Topaz GCDs without their Mountain Busters | Minor 1, Medium 2, Major 4. |
| smn/Summons/ruin4-in-demi | candidate | — | Ruin IV inside a demi | Major. It takes a demi GCD's slot. Checks only the last Ruin IV in a window. |
| smn/Aetherflow/lost-stacks | candidate | — | Aetherflow stacks unspent before the next Energy Drain | Major. A lost Necrotize each. The drift check sees Energy Drain held, not its stacks wasted. |
| smn/Aetherflow/ruin4-unused | candidate | — | a minute with fillers but no Ruin IV | Major. Doesn't check that Further Ruin was up; `checkProcs` covers its expiry. |
| smn/Aetherflow/extra-ruin3 | candidate | — | more than 2 Ruin III fillers a minute | Major. Not fight-aware; usually forced by downtime. Premise check first. |
| smn/Slipstream/missed-ticks | candidate | — | Slipstream ticks lost (target moved, died) | Minor 1, Medium 6, Major 12. A ground DoT the app doesn't value. xivanalysis's hook is suspect (bug). |
| smn/Physick/cast | candidate | — | Physick cast outside downtime | Major. A GCD spent healing; the app's heal-GCD valuation is healers only. |
| smn/AoEUsages/too-few-targets | covered | `smnAoe` | Tri-Disaster, Energy Siphon, Painflare and other AoE on too few targets | Built 2026-10-15 at each pair's highest minimum (Tri-disaster 4, Painflare 4, others 3, Energy Siphon 2); the damage comparison stands in for the patch branches. Premise holds (same resource or attunement). Fires on Red Hot and Deep Blue kills: RaM97t3whCZrJBPm Tri-disaster 6:34 and Topaz Catastrophe 9:01 on one boss (25k, 28k), Emerald Catastrophe, Umbral Flare and Painflare on both (8-30k each); fGjA9DKLQbRa2q1k Astral Flare on both 6:38, 6:41 (12-27k). Not seen: Energy Siphon, Brand of Purgatory, Ruby Catastrophe. No xivanalysis page for these pulls. |
| smn/Swiftcast/bad-use | no-damage | — | Swiftcast unused | Utility. |
| smn/Swiftcast+Lucid/utilities | no-damage | — | — | Display. |
| smn/Defensives/radiant-aegis | no-damage | — | — | Display. |
| smn/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | — |
| smn/Weaving/too-many | verified | `checkGcdGaps` | triple weaves | Fight 16 16:11 (0.36s) is under the 0.5s floor. |
| smn/Interrupts/cancelled-casts | covered | `checkInterrupts` | a cancelled cast | — |
| smn/Death/died | covered | `checkDeaths` | a death | Generic. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| smn/SearingLight/* | modules/SearingLight.tsx:9-37 | 1 Searing Flash a window: Minor 1, Medium 3, Major 5 | yes | yes | no end-of-pull allowance |
| smn/CooldownDowntime/* | modules/GeneralCDDowntime.tsx:4-23 | demis 4.5s, Energy Drain 7.5s, Searing Light 3.5s; checklist 95% | yes | yes | — |
| smn/Summons/* | modules/Summons.tsx:18-510 | 6 demi GCDs: Minor 1 ...; Deathflare / Enkindle / Ruin IV in demi: Major; Rekindle: Minor; Mountain Buster: Minor 1, Medium 2, Major 4 | yes | yes | no end-of-pull allowance |
| smn/Aetherflow/* | modules/Aetherflow.tsx:13-155 | stacks lost / Ruin IV unused / > 2 Ruin III a window: Major | yes | yes | no downtime allowance |
| smn/Slipstream/missed-ticks | modules/Slipstream.tsx:11-81 | 6 ticks a cast: Minor 1, Medium 6, Major 12 | yes | yes | status-id hook |
| smn/Physick/cast | modules/Physick.tsx:13-53 | any Physick outside downtime: Major | indirect | yes | — |
| smn/AoEUsages/too-few-targets | modules/MultiHitSkills.ts:3-72 | Tri-Disaster 3 / 4 (7.3), Energy Siphon 2, Painflare 3 / 4 / 3: Minor 1, Medium 4, Major 7 | yes | yes | patch read per report |

## Open

In priority order (biggest damage cost first). One sample, where none of
these fired; a weaker Summoner's log is the next step.

1. **smn/Summons/deathflare, enkindle; smn/Aetherflow/lost-stacks**
   (candidates). Lost oGCDs, log-visible.
2. **smn/Summons/ruin4-in-demi, mountain-buster** (candidates).
3. **smn/Slipstream/missed-ticks, smn/Physick/cast** (candidates).
4. **smn/Aetherflow/ruin4-unused, extra-ruin3** (candidates; premise
   check, usually forced).
