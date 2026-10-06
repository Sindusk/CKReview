// lib/damage/wow/specs/tank.ts
//
// Tank checks (docs/damage-analysis-plan.md, "WoW build order" step 6, first
// role batch, 2026-10-06). Which windows and resources matter was informed
// by WoWAnalyzer's spec modules (read, not copied: AGPL); every id and number
// here is from our own logs (lib/damage/wow/spell-data.ts and the pulls
// named below). Specs in the samples: Blood (15 players), Protection Paladin
// (8), Brewmaster (2) and Vengeance (1); the last two are unverified.
// Guardian Druid and Protection Warrior aren't in any sample yet.
//
// ── Blood Death Knight ─────────────────────────────────────────────────
// - Dancing Rune Weapon (buff 81256): the Rune Weapon copies the DK's
//   strikes, so a GCD short in the window loses that copy too. The bonus is
//   measured per window: the Rune Weapon's damage ÷ the DK's own damage in
//   it.
// - Blood Plague (55078) uptime.
// - Runic Power (resource 6, logged ×10, max 1250): it's logged on every
//   cast, builders included, so generating at the cap is visible directly.
//   kGVX7tafBT2pM1N3 pull 19: one Blood DK cast 86 of 395 abilities at full
//   Runic Power (Blood Boil, Infliction of Sorrow, Death Grip). Valued at
//   Death Strike's damage per Runic Power: small, since Death Strike is
//   mostly a heal.
//
// ── Protection Paladin ─────────────────────────────────────────────────
// - Sentinel (389539, the Protection Avenging Wrath): GCDs in the window.
//   Its bonus is read from the hits (observedWindowBonus).
// - Holy Power is logged on spenders only (Shield of the Righteous at 5 of
//   5 on 43 of 90 casts, nRGxQ1b8LdMvzC4D pull 6), which can't tell waste
//   from pooling. Not judged.
//
// ── Brewmaster Monk, Vengeance Demon Hunter (unverified) ───────────────
// Tracked cooldowns only (tracked-cooldowns.ts). Brewmaster's energy is at
// 100 on 39 of 183 casts (xKP1M6gwC8WpnrBc pull 14), but how long it sat
// there isn't in the log: not judged yet.

import type { JobCheck } from "../../types";
import { burstGcdFindings, dotUptimeFindings, observedWindowBonus, resourceCapFindings } from "./shared";

const DANCING_RUNE_WEAPON_BUFF = 81256;
const BLOOD_PLAGUE = 55078;
const DEATH_STRIKE = 49998;
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

const bloodRunicPower: JobCheck = (ctx) => resourceCapFindings(ctx, {
  type: 6, name: "Runic Power", scale: 10, spenderIds: [DEATH_STRIKE],
});

const protPalSentinel: JobCheck = (ctx) => burstGcdFindings(ctx, {
  statusId: SENTINEL,
  name: "Sentinel",
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

export const BLOOD_CHECKS: JobCheck[] = [bloodDrw, bloodPlague, bloodRunicPower];
export const PROT_PALADIN_CHECKS: JobCheck[] = [protPalSentinel];
