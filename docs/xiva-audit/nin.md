# xivanalysis audit: Ninja

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/nin/` in the clone.
- **Patch:** one branch: `Ninki.tsx:99-100` `patch.before('7.3')`, where
  Hellfrog / Deathfrog need 3 targets before 7.3 and 2 from 7.3. Supported
  7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (`NIN_CHECKS`: `kunaisBane`,
  `ninki`, `kazematoi`), `tracked-cooldowns.ts` ("Ninja", Bunshin valued
  from its shadow), generic checks. Case study: dDar482XvFKBPJYh FRU (7.1).
- **xivanalysis quirks found** (from the extraction):
  - `Positionals.ts` still lists Trick Attack (replaced by Kunai's Bane in
    7.0), so that requirement can never fill.
  - `Ninjutsu.tsx`: a Ten Chi Jin Doton whose ticks never land passes
    `every()` on an empty list and is counted as single-target.
  - `KunaisBaneUsage.tsx`: the end-of-pull tail isn't downtime-adjusted.
  - `KunaisBaneWindow.tsx`: only the non-TCJ Raiton id counts.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| nin/KunaisBaneWindow/gcd-count | verified | `kunaisBane` (7 GCDs, 8 with Ten Chi Jin; mudras not counted) | Kunai's Bane under 7 GCDs | Medium 1, Major 2. FRU matched. |
| nin/KunaisBaneWindow/kassatsu-actions | verified | `kunaisBane` | no Hyosho Ranryu / Goka Mekkyaku in the window | Major. |
| nin/KunaisBaneWindow/tracked-actions | verified | `kunaisBane` | Raiton ×2 (×1 in the opener), Dream Within a Dream, Tenri Jindo (with TCJ) missing | Medium 1, Major 3. |
| nin/KunaisBaneWindow/limited-armor-crush | candidate | — | Armor Crush inside Kunai's Bane (outside the opener) | Minor. FRU: not built, worth ~10% of 100 potency each (the stack goes to a later Aeolian Edge). Lowest priority. |
| nin/KunaisBaneWindow/tcj-used | no-damage | — | — | Note column. |
| nin/KunaisBaneUsage/held | verified | `checkCooldownDrift` (Kunai's Bane) | Kunai's Bane held | Medium 1, Major 2. |
| nin/KunaisBaneUsage/none | superseded | `checkCooldownDrift` | no Kunai's Bane at all | Major. Fires on any pull shorter than the opener. |
| nin/OGCDDowntime/uses | verified | `checkCooldownDrift` | Kassatsu, Dokumori, Bunshin, Kunai's Bane, DWaD, TCJ or Meisui held | Same groups and offsets. FRU: Bunshin 2 lost (its 3 counts burst alignment); Dokumori / TCJ / Meisui held for the 14:17 burst (no extra use fit). |
| nin/Kassatsu/dropped | candidate | — | Kassatsu expiring unused | Major. A lost Hyosho / Goka. No downtime or end-of-pull allowance in xivanalysis. |
| nin/Kassatsu/huton | candidate | — | Huton under Kassatsu | Major. The Kunai's Bane AoE exception in its text isn't in its code. |
| nin/Kassatsu/generalbads | candidate | — | Fuma Shuriken, Raiton or Doton under Kassatsu | Major. Kassatsu's damage up on the wrong ninjutsu. |
| nin/Kassatsu/suiton | candidate | — | Suiton under Kassatsu | Medium. |
| nin/Kassatsu/rabbit | candidate | — | Rabbit Medium under Kassatsu | Major. Counted again by Ninjutsu/rabbit. |
| nin/Ninjutsu/hyoton | candidate | — | Hyoton | Minor 1, Medium 2. A wasted mudra GCD; log-visible. |
| nin/Ninjutsu/rabbit | candidate | — | Rabbit Medium | Medium 1, Major 3. A failed ninjutsu: the mudras and a GCD lost. Forced cancels are judged too. |
| nin/Ninjutsu/tcj-doton | candidate | — | Ten Chi Jin's Doton on one target | Medium 1, Major 2. |
| nin/Ninjutsu/aoe-doton | candidate | — | Doton cut short (under 6 ticks) | Minor. |
| nin/Ninjutsu/st-doton | candidate | — | Doton on a single target outside the opener | Minor 1, Medium 2, Major 3. |
| nin/Ninki/overcap | verified | `ninki` | Ninki over 100 | Minor 20, Major 50. FRU: ~300 simulated vs its 250. |
| nin/Ninki/hellfrog | candidate | — | Hellfrog Medium on too few targets (3 before 7.3, 2 from 7.3) | Medium. The app has no Ninja AoE check; Bhavacakra is the alternative. Not built (2026-10-15): no Hellfrog on any pull on disk, so no premise check yet. Built as an `aoeComboOnOneTarget` pair (minimum 3; the damage comparison covers 7.3's 2) once one turns up. |
| nin/Ninki/deathfrog | candidate | — | Deathfrog Medium on too few targets | Medium. Same, vs Zesho Meppo. None on disk either. |
| nin/Kazematoi/overcap | verified | `kazematoi` | Armor Crush at 4-5 stacks | FRU 9 lost matched. |
| nin/Kazematoi/leftover | candidate | — | 3+ Kazematoi left at the end | Medium. Would follow the leftAtKill rule (kills only, time held). |
| nin/Kazematoi/unbuffed-aeolian | verified | `kazematoi` | Aeolian Edge at 0 stacks | FRU 1 matched. |
| nin/Procs/dropped-phantom-kamaitachi | covered | `checkProcs` | Phantom Kamaitachi Ready expiring | Medium 1, Major 2. Not seen firing. |
| nin/Procs/dropped-tenri-jindo | covered | `checkProcs` | Tenri Jindo Ready expiring | Same. |
| nin/Raiju/dropped | candidate | — | Raiju Ready stacks lost to a combo GCD | Major. A lost Forked / Fleeting Raiju each; `checkProcs` sees expiries only, and Raiju is removed by another press. |
| nin/Positionals/missed | covered | `checkPositionals` | a missed flank / rear | Not matched against a page. Its Trick Attack entry is dead. |
| nin/Combos/broken | covered | `checkCombos` | a broken combo | Generic. |
| nin/Weaving/too-many | covered | `checkGcdGaps` | weaves past the limit (+1 per Dream Within a Dream) | Mudras have a 0.5s recast in its data, so it allows one weave after a mudra. |
| nin/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | — |
| nin/Death/died | covered | `checkDeaths` | a death | Generic. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| nin/KunaisBaneWindow/* | modules/KunaisBaneWindow.tsx:14-181 | 7 GCDs (+1 with TCJ): Medium 1, Major 2; Hyosho / Goka: Major 1; Raiton 2, DWaD 1, Tenri 1: Medium 1, Major 3; Armor Crush: Minor | yes | yes | TCJ Raiton id not counted |
| nin/KunaisBaneUsage/* | modules/KunaisBaneUsage.tsx:55-108 | held: Medium 1, Major 2; none: Major | yes | yes | tail not downtime-adjusted |
| nin/OGCDDowntime/uses | modules/OGCDDowntime.ts:4-58 | seven groups with opener offsets; checklist 95% | yes | yes | — |
| nin/Kassatsu/* | modules/Kassatsu.tsx:38-125 | dropped / Huton / Fuma-Raiton-Doton / Rabbit: Major 1; Suiton: Medium 1 | yes | yes | no exceptions despite the text |
| nin/Ninjutsu/* | modules/Ninjutsu.tsx:11-118 | Hyoton: Minor 1, Medium 2; Rabbit: Medium 1, Major 3; Doton rules by tick targets | yes | yes | empty-ticks TCJ Doton |
| nin/Ninki/* | modules/Ninki.tsx:17-197 | overcap: Minor 20, Major 50; frogs under 3 (before 7.3) / 2: Medium 1 | yes | no (inferred) / yes | starts at 0 |
| nin/Kazematoi/* | modules/Kazematoi.tsx:11-102 | overcap: Minor 1, Medium 2, Major 5; leftover ≥ 3: Medium; unbuffed Aeolian: Minor 1, Medium 2, Major 4 | yes | no (inferred) | no end-of-pull allowance |
| nin/Procs/* | modules/Procs.tsx:7-52 | Phantom Kamaitachi / Tenri Jindo dropped: Medium 1, Major 2 | yes | yes | — |
| nin/Raiju/dropped | modules/Raiju.tsx:18-60 | Raiju stacks lost to a combo GCD: Major 1 | yes | yes | refresh can undercount stacks |
| nin/Positionals, Combos, Weaving, AlwaysBeCasting, Death | modules/Positionals.ts, Combos.ts, Weaving.ts:4-16; core | core rules; +1 weave per DWaD | yes | yes | Trick Attack entry dead |

## Open

In priority order (biggest damage cost first). One Ninja sample so far.

1. **nin/Ninjutsu/rabbit, nin/Kassatsu/*** (candidates). A failed or
   misused ninjutsu costs a big hit each; all log-visible from casts.
2. **nin/Raiju/dropped** (candidate). Raiju Ready removed by a combo GCD.
3. **nin/Ninki/hellfrog, deathfrog** (candidates). AoE on too few
   targets, patch-gated at 7.3.
4. **nin/Ninjutsu/*-doton, hyoton** (candidates).
5. **nin/Kazematoi/leftover** (candidate). Kills only, by time held.
6. **nin/KunaisBaneWindow/limited-armor-crush** (candidate, a few k).
7. **nin/Procs/*, nin/Positionals** (covered). Not matched on a page.
