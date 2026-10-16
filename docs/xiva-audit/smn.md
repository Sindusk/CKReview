# xivanalysis audit: Summoner

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/smn/` in the clone.
- **Patch:** one module branches: `MultiHitSkills.ts` (Tri-Disaster 3
  before 7.3, 4 from 7.3; Painflare 3 before 7.2, 4 for 7.2-7.4, 3 from 7.5).
  Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/caster.ts` (`SMN_CHECKS`: `searingLight`,
  `smnAoe`, `smnDemis`, `smnRuin4InDemi`, `smnAetherflow`,
  `smnMountainBuster`, `smnPhysick`; Aetherflow and Further Ruin lanes in
  `gauges.ts`), `tracked-cooldowns.ts` ("Summoner"), generic checks.
  Phase 3 (2026-10-16): 42 Summoner pulls on disk scanned, premise checked
  on 38 FFLogs Red Hot and Deep Blue parses (rankings pages 1 and 3).
- **xivanalysis bug found** (source-confirmed): `Slipstream.tsx:36-40`
  hooks cast events filtered by `statuses.SLIPSTREAM.id`, the status id
  (2706), not the action's (25837), so no cast is ever counted and the
  missed-ticks rule never fires.

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
| smn/Summons/deathflare | covered | `smnDemis` | a Bahamut window without Deathflare | Built 2026-10-16, with Sunflare for Solar Bahamut (xivanalysis doesn't check it): her average. Not seen for Deathflare; Sunflare on pnLBzfbH8NjGAJRg Enuo wipes 4 (2:02, 254k) and 6 (6:40, 154k), and pull 13 6:18 (dead, shown). Top 38: 1 skipped. No xivanalysis page yet. |
| smn/Summons/enkindle | verified | `smnDemis` | a demi window without Enkindle | Built 2026-10-16: the demi's Akh Morn / Revelation / Exodus hits over her presses. Seen: fGjA9DKLQbRa2q1k 4:03 (191k, Sunflare pressed, no Enkindle), LmwgxA7B4d1NzqWH 9:37 (175k, Sunflare then Teraflare), pnLBzfbH8NjGAJRg Enuo pull 15 3:03 (136k, 8s of uptime before the boss left). Matched xivanalysis's 1 on both fGjA9DKLQbRa2q1k (Raven Nelhah) and LmwgxA7B4d1NzqWH (Moca Blend). |
| smn/Summons/rekindle | no-damage | — | a Phoenix window without Rekindle | Minor. A heal. |
| smn/Summons/mountain-buster | verified | `smnMountainBuster` | Topaz GCDs without their Mountain Busters | Built 2026-10-16 from cast order (Titan's Favor isn't in the log; 538 Mountain Busters on disk all came within 2.4s of their Topaz GCD): lost when the next Topaz GCD or Summon comes first; her average. 8 counted on disk (LmwgxA7B4d1NzqWH 5:43, 6:50, 7:56; 25k each), 1 lost to a death. Top 38: 6 lost. Matched xivanalysis on LmwgxA7B4d1NzqWH (3) and fGjA9DKLQbRa2q1k (1). On YPhxRTb9Ld7BJaXp (Luna Xx) its 1 is the Topaz Rite at 9:03.4, 1.5s before the 9:04.9 kill, which the app doesn't judge (cut by the kill). |
| smn/Summons/ruin4-in-demi | verified | `smnRuin4InDemi` | Ruin IV inside a demi | Built 2026-10-16, only when the window got fewer demi GCDs than her fullest: her average demi GCD over her Ruin III. LmwgxA7B4d1NzqWH 8:45 in the 8:32 Solar Bahamut (4 demi GCDs, 33k): xivanalysis's 1. Top 38: 1. |
| smn/Aetherflow/lost-stacks | covered | `smnAetherflow` | Aetherflow stacks unspent before the next Energy Drain | Built 2026-10-16 as a gauge (cap 2, death clears it) with a lane; her average Necrotize each, kill rule for stacks held. On disk none lost at the cap outside deaths; held at the kill: YPhxRTb9Ld7BJaXp 1 (81k, 18s held), fGjA9DKLQbRa2q1k 1 (forced, 1s before the kill). xivanalysis counts stacks held at the end of wipes and after deaths too; the app doesn't. Pages (2026-10-16): YPhxRTb9Ld7BJaXp's 1 matches; fGjA9DKLQbRa2q1k's 1 is the stack the app shows forced (Energy Drain 1.1s before the kill); LmwgxA7B4d1NzqWH's 1 was lost at the 9:10 death (not counted). |
| smn/Aetherflow/ruin4-unused | covered | `smnAetherflow` | a minute with fillers but no Ruin IV | Built 2026-10-16: Further Ruin simulated from casts (not in the log; 60s from Energy Drain's hit), lost when replaced, run out, or held at the kill with a Ruin III / Tri-disaster landed while it was held; her Ruin IV over that filler. qjCMx4bRfgNKwX9T Dancing Mad pull 2: Ruin III 11:35 in the 11:16 window (26k). Top 38: at least 3. |
| smn/Aetherflow/extra-ruin3 | wrong | — | more than 2 Ruin III fillers a minute | Fight-blind: 9 of 19 top parses cast 8-12 fillers in the Energy Drain minute around 5:00 of Red Hot and Deep Blue, 0-1 elsewhere. A filler that cost a Ruin IV is ruin4-unused's. |
| smn/Slipstream/missed-ticks | wrong | — | Slipstream ticks lost (target moved, died) | Never fires in xivanalysis (status-id hook). The premise fails here too: the top 20 got all 6 ticks on 86 of 165 casts (boss movement); on disk 176 of 237. |
| smn/Physick/cast | covered | `smnPhysick` | Physick cast outside downtime | Built 2026-10-16: an average GCD each; in forced time not shown. The only ones on disk (L9BzKkD2nxcVgHTC Necron pull 20, 4:23, 4:25) are in downtime. |
| smn/AoEUsages/too-few-targets | verified | `smnAoe` | Tri-Disaster, Energy Siphon, Painflare and other AoE on too few targets | Built 2026-10-15 at each pair's highest minimum (Tri-disaster 4, Painflare 4, others 3, Energy Siphon 2); the damage comparison stands in for the patch branches. Premise holds (same resource or attunement). Fires on Red Hot and Deep Blue kills: RaM97t3whCZrJBPm Tri-disaster 6:34 and Topaz Catastrophe 9:01 on one boss (25k, 28k), Emerald Catastrophe, Umbral Flare and Painflare on both (8-30k each); fGjA9DKLQbRa2q1k Astral Flare on both 6:38, 6:41 (12-27k). Not seen: Energy Siphon, Brand of Purgatory, Ruby Catastrophe. Matched xivanalysis on RaM97t3whCZrJBPm: Tri-disaster 1, Painflare 2, Umbral Flare 9, Topaz Catastrophe 2, Emerald Catastrophe 6. The raw comparison found only 5 Umbral Flares, 1 Painflare and 1 Topaz: on two bosses Umbral Flare is ~8% short of Umbral Impulse, so crits decided each, and the 6:44 Painflare landed in the burst. The buff-neutral comparison (2026-10-15) flags all of them. |
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

No candidates left (2026-10-16). Enkindle, Mountain Buster and Ruin IV
in a demi verified on three pages the same day. Still waiting:

1. **smn/Summons/deathflare (Sunflare)**: Deathflare not seen; Sunflare
   only on pnLBzfbH8NjGAJRg Enuo wipes. The 12 lowest Red Hot and Deep
   Blue Summoners (2026-10-16) pressed Deathflare in every Bahamut; the
   two missing Sunflares came 2-3s before a death.
2. **smn/Aetherflow/ruin4-unused**: qjCMx4bRfgNKwX9T Dancing Mad pull 2
   (Alun Kumiho, 11:35). Matched his page 2026-10-16: "1 cast of Ruin 4
   lost" = the app's Further Ruin at 11:35 (26k).
3. **smn/Aetherflow/lost-stacks**: the kill case matched YPhxRTb9Ld7BJaXp;
   none lost at the cap on disk.
4. **smn/Physick/cast**: no unforced one on disk.
