# xivanalysis audit: Ninja

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/nin/` in the clone.
- **Patch:** one branch: `Ninki.tsx:99-100` `patch.before('7.3')`, where
  Hellfrog / Deathfrog need 3 targets before 7.3 and 2 from 7.3. Supported
  7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (`NIN_CHECKS`: `kunaisBane`,
  `ninki`, `kazematoi`, `ninAoe`, `ninjutsu`), `tracked-cooldowns.ts` ("Ninja", Bunshin valued
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
| nin/KunaisBaneWindow/limited-armor-crush | verified | `kazematoi` ("Armor Crush in Kunai's Bane") | Armor Crush inside Kunai's Bane (outside the opener) | Built 2026-10-16: only an Armor Crush with Kazematoi held (so the opener's, at 0, never counts), valued at (buffed Aeolian Edge − Armor Crush) × the window's observed bonus. Fires on most Red Hot and Deep Blue Ninja kills on disk, 0-2k each (e.g. 7zwpcLxk2Fd1h6Vr 3:04). A window whose removal never logged is cut at 16s. Against xivanalysis 2026-10-16 on zMJdajRYyNF3LVkr (Eternal Gem): its 3 are 1:05, 6:16 and 7:29; its code counts every Armor Crush in a window but the opener's, never checking Kazematoi despite its text, and the 1:18.0 one came at 0 stacks (not counted here, by design). The 6:16.7 window on Watery Grave was missed: hits on the add show no bonus in their multipliers, so the value came out 0; it falls back to Kunai's Bane's 10% now (6:27.9, 2k). 2 of its 3, the third rightly not. |
| nin/KunaisBaneWindow/tcj-used | no-damage | — | — | Note column. |
| nin/KunaisBaneUsage/held | verified | `checkCooldownDrift` (Kunai's Bane) | Kunai's Bane held | Medium 1, Major 2. |
| nin/KunaisBaneUsage/none | superseded | `checkCooldownDrift` | no Kunai's Bane at all | Major. Fires on any pull shorter than the opener. |
| nin/OGCDDowntime/uses | verified | `checkCooldownDrift` | Kassatsu, Dokumori, Bunshin, Kunai's Bane, DWaD, TCJ or Meisui held | Same groups and offsets. FRU: Bunshin 2 lost (its 3 counts burst alignment); Dokumori / TCJ / Meisui held for the 14:17 burst (no extra use fit). Meisui and Kassatsu deal nothing themselves, so their drift was never reported; valued since 2026-10-16 (`unlockValue`: a Zesho Meppo; Hyosho Ranryu over Raiton). Matched MzjZgVWBaLw7tHyT (Natalie Suki): Meisui 4/5 and Kassatsu 9/10 = 1 each, Kunai's Bane 2 and Bunshin 5/7 = 2 each; Dokumori (party buff, `BuffLedger.addedBy`). Her Deathfrog on one target = its 1; its 2 Hellfrogs include one at 5:53.7 on an add that was already gone (no hit; not a target-count error, not adopted). |
| nin/Kassatsu/dropped | verified | `ninjutsu` | Kassatsu expiring unused | Built 2026-10-15, read from the Kassatsu buff (a removal with no ninjutsu cast beside it); the generic proc check now skips Kassatsu. A Hyosho Ranryu over the combo GCD pressed instead. One ending up to 3s before a death is shown, not counted (the log strips buffs before the death event: djChYqt4b7K8aAfP 7:32). Fires on cZ42C1y3JRNGXWLH 3:19, 4:21; cBZXM6kayd7Tf9Fg 4:16; 7zwpcLxk2Fd1h6Vr 8:00; yPHmaGTY2btq1wD9 0:17; JZ1KXhDbqkNH3jxR FRU pull 7 1:53 (110-243k). Found by searching the 108 lowest Red Hot and Deep Blue Ninja parses. Matched xivanalysis (2026-10-15): cZ42C1y3JRNGXWLH 2, cBZXM6kayd7Tf9Fg 1, 7zwpcLxk2Fd1h6Vr 1. |
| nin/Kassatsu/huton | verified | `ninjutsu` | Huton under Kassatsu | A Hyosho over a Raiton (the mudra charge Kassatsu saved goes to a Raiton). Fires on LmwgxA7B4d1NzqWH 5:28 (63k, for Kunai's Bane on two bosses). Matched xivanalysis there (1). |
| nin/Kassatsu/generalbads | verified | `ninjutsu` | Fuma Shuriken, Raiton or Doton under Kassatsu | Same value. Fires on VzycM18rpn6bWxXY ×4 (72k each), 7zwpcLxk2Fd1h6Vr ×7 (77k; she never cast Hyosho, so it's 2.28 × her Raiton, the ratio measured on 16 pulls), djChYqt4b7K8aAfP 9:44. The search's cast-only reading over-counted it: a Kassatsu that had already lapsed was blamed on the next ninjutsu. Matched xivanalysis: VzycM18rpn6bWxXY 4, 7zwpcLxk2Fd1h6Vr 7. |
| nin/Kassatsu/suiton | verified | `ninjutsu` | Suiton under Kassatsu | Same value (the Suiton was needed for Kunai's Bane; Kassatsu saved its charge). Fires on cZ42C1y3JRNGXWLH 1:07 (31k). Matched xivanalysis there (1). |
| nin/Kassatsu/rabbit | verified | `ninjutsu` | Rabbit Medium under Kassatsu | One finding, a whole Hyosho (not counted again as a Rabbit). Fires on cBZXM6kayd7Tf9Fg 2:17 (201k). Matched xivanalysis there (1). |
| nin/Ninjutsu/hyoton | verified | `ninjutsu` | Hyoton | A Raiton (with its Raiju) less the Hyoton, buff-neutral; in Ten Chi Jin, against its Raiton (added after VzycM18rpn6bWxXY 2:26: Fuma, Hyoton, Huton; 75k). Matched xivanalysis: cZ42C1y3JRNGXWLH 1, VzycM18rpn6bWxXY 2. Fires on cZ42C1y3JRNGXWLH 3:23, VzycM18rpn6bWxXY 0:20, yPHmaGTY2btq1wD9 0:19, kC7Y3WbzvKcZrBxT The Tyrant 10:13, JZ1KXhDbqkNH3jxR FRU pull 15 8:43 (75-111k). |
| nin/Ninjutsu/rabbit | verified | `ninjutsu` | Rabbit Medium | A Raiton and its Raiju lost. Fires on cZ42C1y3JRNGXWLH 4:24 (Ten Ten), cBZXM6kayd7Tf9Fg ×4, fGjA9DKLQbRa2q1k 7:20, kC7Y3WbzvKcZrBxT The Tyrant 9:30 (110-159k). Matched xivanalysis: cZ42C1y3JRNGXWLH 1; cBZXM6kayd7Tf9Fg 5 (its 5 include the one under Kassatsu, which the app counts once, as Kassatsu/rabbit). |
| nin/Ninjutsu/tcj-doton | covered | `ninjutsu` | Ten Chi Jin's Doton on one target | Built 2026-10-15: its ticks (buff-neutral) against her average Ten Chi Jin Suiton. Not adopted on zMJdajRYyNF3LVkr 2:33 (xivanalysis 1): Fuma, Katon, Doton, but the Doton ticked 67k across both bosses against ~55k for a Ten Chi Jin Suiton, and that Suiton's Shadow Walker (20s) wouldn't have reached the next Kunai's Bane (3:08). MzjZgVWBaLw7tHyT 6:38.4 (Natalie Suki): xivanalysis flags its one-target Doton; its ticks (~44k) equal her Ten Chi Jin Suiton, so the app shows nothing here; the cost xivanalysis names (Suiton keeps Meisui on time) is the Meisui drift, which now counts. |
| nin/Ninjutsu/aoe-doton | verified | `ninjutsu` | Doton cut short (under 6 ticks) | Judged by damage: a Doton is flagged when its ticks (buff-neutral) deal less than a Raiton, on any number of targets. |
| nin/Ninjutsu/st-doton | verified | `ninjutsu` | Doton on a single target outside the opener | Same check. Fires on zMJdajRYyNF3LVkr 5:50 (left after 4 ticks on both bosses, 67k) and 6:33 (no ticks at all, 108k). Matched xivanalysis there: its "unoptimized" 1 and "single-target" 1. |
| nin/Ninki/overcap | verified | `ninki` | Ninki over 100 | Minor 20, Major 50. FRU: ~300 simulated vs its 250. Every gain is read at the cast since 2026-10-16 (xivanalysis reads hits): hits log ~0.7s late and can follow the spender they paid for (JZ1KXhDbqkNH3jxR FRU pull 3, Fleeting Raiju 0:26.80, hits 0:27.56 / 0:27.65, Bhavacakra 0:27.51); a Throwing Dagger that never landed still paid for a Bhavacakra (same pull, 2:39.97); and a Bunshin shadow hit can go unlogged, so the shadow's +5 comes from the Bunshin stack each weaponskill takes (MFGhwLnJ34pz7cWQ, Keichi 1:46.28). Findings with the simulation below zero 113 → 0 on disk, Ninki findings 186 → 151. zMJdajRYyNF3LVkr: 70 lost here, xivanalysis 60 (the 8:45.8 Dokumori at 100 is real). |
| nin/Ninki/hellfrog | verified | `ninAoe` (vs Bhavacakra, one target) | Hellfrog Medium on too few targets (3 before 7.3, 2 from 7.3) | Built 2026-10-15. One target only: from 7.3 two out-damage Bhavacakra (pre-7.3 two-target frogs go unseen). Premise holds (same Ninki). Fires on Red Hot and Deep Blue kills with the bosses apart: mgTQJjX2nW6ANkP7 6:51 (21k), jXG76ba43VDLAvYz 4:07 (17k) and 9:16 as Deep Blue died (24k). Matched xivanalysis on jXG76ba43VDLAvYz (2 of its 2). |
| nin/Ninki/deathfrog | covered | `ninAoe` (vs Zesho Meppo, one target) | Deathfrog Medium on too few targets | Fires since 2026-10-16 on MzjZgVWBaLw7tHyT (fetched for this; Vamp Fatale fight 21, Natalie Suki, found with ff-probe.js --hits on a single-boss fight): 4:24.3, 30k (Zesho Meppo 61k at the same buffs); her Hellfrog at 7:04.7 too (14k). Awaiting the page. |
| nin/Kazematoi/overcap | verified | `kazematoi` | Armor Crush at 4-5 stacks | FRU 9 lost matched. |
| nin/Kazematoi/leftover | verified | `kazematoi` ("Kazematoi left at the kill") | 3+ Kazematoi left at the end | Built 2026-10-16, kills only: 3+ at the kill means the last Armor Crush could have been a buffed Aeolian Edge (the swap costs 3 stacks, so never two), valued at their averages' difference. Forced when that Armor Crush was. 6 of 16 Ninja kills on disk end with 3-5; 5 fire (2-18k: 7zwpcLxk2Fd1h6Vr, cZ42C1y3JRNGXWLH, YPhxRTb9Ld7BJaXp, zMJdajRYyNF3LVkr; kC7Y3WbzvKcZrBxT forced by the closing Limit Break). Matched xivanalysis 2026-10-16 on zMJdajRYyNF3LVkr: 5 left at the kill; its 12 Kazematoi lost at the cap match the app's too. |
| nin/Kazematoi/unbuffed-aeolian | verified | `kazematoi` | Aeolian Edge at 0 stacks | FRU 1 matched. |
| nin/Procs/dropped-phantom-kamaitachi | covered | `checkProcs` | Phantom Kamaitachi Ready expiring | Medium 1, Major 2. Not seen firing. |
| nin/Procs/dropped-tenri-jindo | covered | `checkProcs` | Tenri Jindo Ready expiring | Same. |
| nin/Raiju/dropped | verified | `ninjutsu` | Raiju Ready stacks lost to a combo GCD | Stacks simulated from casts (Raiton +1 to 3, a Raiju −1, a combo GCD drops the rest); expiries come from the buff (the generic proc check skips Raiju Ready now). Each a Raiju over a combo GCD (27-42k). Fires on every searched pull, e.g. cZ42C1y3JRNGXWLH 2:28 (Aeolian Edge removed the buff in the log). Matched xivanalysis on all six: 6, 6, 1, 2, 4, 2 stacks. Its count leaves out stacks that simply expire; the app adds those as "Raiju Ready expired" (cZ42C1y3JRNGXWLH 8:42, VzycM18rpn6bWxXY 5:05). |
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

In priority order (biggest damage cost first).

1. **nin/Procs/*, nin/Positionals** (covered). Not matched on a page.
   zMJdajRYyNF3LVkr's page (2026-10-16): Raiju Ready dropped 4 = the
   app's 4 (3:17, 6:01, 8:57, 9:12). Ninki lost: xivanalysis 60, the app
   85, now 75. Traced 2026-10-16: Mug / Dokumori's 40 was added at the
   hit, which can log after the spender it paid for (Dokumori cast
   6:23.4, hit 6:24.50, Zesho Meppo 6:24.48), so the simulation went below
   zero and its clamp overstated later overcaps. Now added at the cast:
   findings carrying an underflow 235 → 113 on disk, Ninki-lost findings
   278 → 186. The rest were hit-timed gains (no gain was missing from
   the table): every gain is read at the cast now, and no simulation
   goes below zero (see nin/Ninki/overcap).
2. **nin/Ninjutsu/tcj-doton** (covered). Not seen as a loss yet. A second
   one-target case, MzjZgVWBaLw7tHyT 6:38.4 (Fuma, Hyoton, Doton): 7 ticks,
   ~44k, level with her Ten Chi Jin Suiton average, so no finding (its
   Hyoton is one, 60k). Awaiting the page. Seen firing 2026-10-16:
   JZ1KXhDbqkNH3jxR Futures Rewritten pull 5 4:25 (Alfie Brine; 1k, its
   ticks 54k against a 55k Ten Chi Jin Suiton). The three Ten Chi Jin
   Dotons on disk all come out within a few k of a Suiton: a small loss
   at most.
3. **nin/Ninki/deathfrog** (covered). Fires on MzjZgVWBaLw7tHyT; awaiting
   the page.
