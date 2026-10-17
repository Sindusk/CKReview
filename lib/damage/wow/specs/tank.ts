// lib/damage/wow/specs/tank.ts
//
// Tank checks (docs/archive/damage-analysis-plan.md, "WoW build order" step 6, first
// role batch, 2026-10-06). Which windows and resources matter was informed
// by WoWAnalyzer's spec modules (read, not copied: AGPL); every id and number
// here is from our own logs (lib/damage/wow/spell-data.ts and the pulls
// named below). Specs in the samples: Blood (15 players), Protection Paladin
// (8), Brewmaster (9 player-pulls since its WoWAnalyzer audit pass), Vengeance (24 player-pulls since its
// WoWAnalyzer audit pass) and Guardian Druid (27 since its pass).
// Protection Warrior isn't in any sample yet.
//
// ── Guardian Druid ─────────────────────────────────────────────────────
// No spec check (WoWAnalyzer audit phase 3, 2026-10-17;
// docs/wowa-audit/druid-guardian.md has every number). Measured on 27
// Guardian player-pulls, all Mythic: the top Sol (mNkHXhaD6Y2tqQTg,
// Vashnik 100th), Shasta (Ndh2H6Qw4Pp1qaMk, 99.7th), 주황양배추
// (aZ6NnwL8g9PdpGJ1, Entombed Sentinels 100th), Thwash (L8yGzCABtm6Zx1YR,
// 99.3rd); Gowownage, 失落的桃子, Worthtwo, Kirabearr, Zhorxanina; the weak
// Экстраособь (7L3RKpavDA8T4MjY) and Mêrùem (LCFp3wbHvQqNP4my); the
// static's Diggersby (16 pulls on seven bosses, gVDPhzp61Zm29HMw).
// Talents (casts and buffs): everyone plays Incarnation: Guardian of Ursoc
// (102558, which casts Wild Guardian 1269658), Gore, and Elune's Chosen
// (Lunar Beam 204066, Fury of Elune procs); Red Moon (1252871) on all but
// three (失落的桃子, Kirabearr and Mêrùem press Moonfire). Nobody casts
// Berserk or Convoke; Tooth and Claw shows nowhere; Galactic Guardian on
// those three.
// - Presses: none of the bear presses were in the spell survey, so every
//   Mangle and Thrash read as idle (4.5% GCD uptime on 주황양배추); game.ts
//   GUARDIAN_PRESSES. Top players now 86–93%, Diggersby 66–81%: he casts
//   no Swipe and waits on Mangle / Thrash (Entombed Sentinels Pull 5
//   2:51, 3.3s after a Mangle).
// - Gap price runs high: an idle Guardian GCD is priced at the average
//   GCD (86–113k, Thrash's bleed and Moonfire / Red Moon ticks counted by
//   name), but the free press is a Swipe: 10k of hits plus a 21% Gore
//   chance on a ~50k Mangle. Not changed here (a role-wide valuation).
// - Tracked: Lunar Beam (tracked-cooldowns.ts), valued by its hits.
//   Gore expires in procs.ts (all four expiries in forced time).
// - Measured, not built: Incarnation drift (180s less 1s per 25 Rage
//   spent, fitted on 49 intervals with none under the line; seven of nine
//   top and middle tanks hold one use 32–67s, the weak 1–12s, Diggersby
//   63–85s, so it doesn't separate; no whole use is lost on anyone); idle inside Incarnation (0–6 GCDs
//   short a window, top as weak); Red Moon drift (fires only on the two
//   top players who sync it with Lunar Beam); Rage at the cap (0–4 casts
//   a pull on top players, 21–23 on the weakest, ~150k at most).
//
// ── Blood Death Knight ─────────────────────────────────────────────────
// WoWAnalyzer audit phase 3, 2026-10-17 (docs/wowa-audit/deathknight-blood.md;
// specs/blood.ts holds the model and every number, 97 player-pulls).
// - Dancing Rune Weapon (buff 81256): the Rune Weapon copies the DK's
//   strikes, so a GCD short in the window loses that copy too. The bonus is
//   measured per window: the Rune Weapon's damage ÷ the DK's own damage in
//   it. Top players 6–63k a pull, the weaker 100–250k.
// - Dancing Rune Weapon drift is valued now (blood.ts
//   dancingRuneWeaponValue: the Rune Weapon's hits, 0.6–2.5M a use); it was
//   worth 0 and never showed. Reaper's Mark tracked for Deathbringer.
// - Free Death and Decay held (blood.ts): Crimson Scourge held with no
//   Death and Decay down, top 1–36k, weak up to 346k.
// - Blood Plague (55078) uptime.
// - Runic Power at the cap: removed for Blood (2026-10-17, for the user's
//   review). It read 0.34–1.56M on the top players by pricing casts that
//   generate none (Blood Boil, Death Grip); rebuilt from the real
//   generators it doesn't separate top from weak (blood.ts). The note
//   below is the case study's, from before. Death Strike isn't "mostly a
//   heal" in these logs: 20–30% of a top player's damage (Lyrîa 20M,
//   180k a press).
// - Checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3 (Veinglas;
//   reference ACmXHMFtaPLR9k8w's Frostydn, 99th percentile; 2026-10-13):
//   Runic Power wasted 354 vs 48 there; this check finds 115 vs 40 (only
//   casts made at the cap; passive gains while capped, Runic Attenuation
//   and Anti-Magic Shell absorbs, aren't seen). A per-cast rebuild
//   (gain per ability + passive per second, fitted on uncapped pairs) read
//   148 vs 13: no closer, not adopted. Even 354 is ~0.9M at his ~2.5k per
//   Runic Power. Runes wasted (21 vs 9) show up as idle: uptime 74% vs
//   86%, small delays 18.2s vs 6.8s. Same pace (0.90s vs 0.91s). Death
//   Strike timing and Marrowrend use (15 vs 12 flagged) aren't damage.
//
// ── Protection Paladin ─────────────────────────────────────────────────
// - Sentinel (389539, the Protection Avenging Wrath): GCDs in the window.
//   Its bonus is read from the hits (observedWindowBonus).
// - Holy Power is logged on spenders only (Shield of the Righteous at 5 of
//   5 on 43 of 90 casts, nRGxQ1b8LdMvzC4D pull 6), which can't tell waste
//   from pooling. Not judged. (WoWAnalyzer rates Thatapaddlin 7.0% and the
//   99th-percentile Holyvi 3.7% wasted, both "perfect".)
// - Checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3 (Thatapaddlin;
//   reference VWMbYPRyxCAmhZFj fight 9's Holyvi, 99th percentile;
//   2026-10-13): no new check. Sentinel 98%, Divine Toll 91%, defensives
//   and priority accuracy (81% vs 85%) close. Ability uptime 73.0% vs
//   83.4%: the app's small delays (19.3s) and gaps, 6.7k/s vs 3.1k/s est.
//   loss. Its 20.9s "gap" at 4:56–5:17 had a cast every second (melee
//   range on the slime). One combat potion of two (0.90M).
//
// ── Vengeance Demon Hunter ─────────────────────────────────────────────
// No spec check (WoWAnalyzer audit phase 3, 2026-10-17; specs/vengeance.ts
// holds the model and every number). Tracked: Sigil of Flame (30s) and
// Sigil of Spite (60s), each use valued by its own hits (they log under
// other ids than the casts) less the GCD it took, held for Vashnik's
// Venoms allowed (burstHold). Not judged, measured: Fury at the cap (the
// spenders are GCD-bound: top players cast Soul Cleave at 120 Fury back
// to back), Soul Fragment waste and Spirit Bomb fragment counts (top
// players as weak), the Metamorphosis window (6–338k a pull, top as weak).
// Sigil of Chains is a GCD press (game.ts).
//
// ── Brewmaster Monk ────────────────────────────────────────────────────
// WoWAnalyzer audit phase 3, 2026-10-17 (docs/wowa-audit/monk-brewmaster.md;
// specs/brewmaster.ts holds the model and every number, 9 player-pulls).
// - Breath of Fire reset lost (brewmaster.ts): each Keg Smash resets
//   Breath of Fire; a second Keg Smash before the Breath of Fire wastes
//   one (37–52k a press). Top players 1 a pull (Fluffytail 5), the weaker
//   6–15 (Qywsi 656k).
// - Tracked: Exploding Keg (60s, now with its later hits and Fuel on the
//   Fire, burstHold for Vashnik's Venoms) and Invoke Niuzao (120s, valued
//   by its hits and the Flurry Strikes its window adds).
// - Not judged: Energy (17–25% of the top players' casts at 100, the
//   weaker 10–28%), Blackout Combo on Keg Smash, Touch of Death, Chi Burst.

import type { JobCheck } from "../../types";
import { burstGcdFindings, dotUptimeFindings, observedWindowBonus } from "./shared";
import { BLOOD_SPEC_CHECKS } from "./blood";

const DANCING_RUNE_WEAPON_BUFF = 81256;
const BLOOD_PLAGUE = 55078;
const SENTINEL = 389539;

const bloodDrw: JobCheck = (ctx) => burstGcdFindings(ctx, {
  statusId: DANCING_RUNE_WEAPON_BUFF,
  name: "Dancing Rune Weapon",
  bonus: (c, w) => {
    const inW = (t: number) => t >= w.startMs && t <= w.endMs;
    const own = c.player.damageDone.filter((e) => !e.pet && inW(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
    const rune = c.player.damageDone.filter((e) => e.pet === "Rune Weapon" && inW(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
    return own > 0 ? rune / own : 0;
  },
  bonusBasis: "the Rune Weapon's damage in the window ÷ the DK's own",
});

const bloodPlague: JobCheck = (ctx) => dotUptimeFindings(ctx, { statusIds: [BLOOD_PLAGUE], name: "Blood Plague" });

const protPalSentinel: JobCheck = (ctx) => burstGcdFindings(ctx, {
  statusId: SENTINEL,
  name: "Sentinel",
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

export { BREWMASTER_CHECKS } from "./brewmaster";
export const BLOOD_CHECKS: JobCheck[] = [bloodDrw, bloodPlague, ...BLOOD_SPEC_CHECKS];
export const PROT_PALADIN_CHECKS: JobCheck[] = [protPalSentinel];
