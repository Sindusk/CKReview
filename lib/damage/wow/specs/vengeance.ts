// lib/damage/wow/specs/vengeance.ts
//
// Vengeance Demon Hunter's damage model, from the WoWAnalyzer audit's phase
// 3 (docs/wowa-audit/demonhunter-vengeance.md, 2026-10-17). No spec check
// came out of it: every candidate either fired on the top players as much
// as on the weak ones or was worth too little. What it changed is the two
// tracked sigils (tracked-cooldowns.ts), which until now were worth 0 a use
// and so never showed; sigilValue below prices them.
//
// Measured on 24 Vengeance player-pulls, all Mythic: the top Entombed
// Sentinels parses Avade (1nWG9c7t4qHLDmYy, 100th), Elruth
// (VBPkNJnWMdZx8wQ1, 99.6th), Xkito (aZ6NnwL8g9PdpGJ1, 97.5th), and on
// Vashnik Supadh (atJRCq3YM8P4KGpD, 99.5th), Felsky (9w3bK4qhrRC82gVX) and
// Thanquiol (Kag91qVZ2YJ7MQAb); the weaker Tormfella (6kHtGaQXCMWYxFpZ),
// Chajinadh (Ftj4vwHf9RazPcqV) and the static's Misohornie (16 pulls on
// seven bosses, gVDPhzp61Zm29HMw). Spell ids are from those logs'
// masterData.
//
// Talents (from casts, buffs, debuffs and hit ids): all 24 play Annihilator
// (Voidfall Meteor, World Killer, Meteor Shower, Catastrophe), Spirit Bomb,
// Fel Devastation (not Fel Desolation), Fiery Demise (fire hits on a
// Fiery Brand target ×1.2–1.5: Voidfall Meteor 82k vs 65k, Sigil of Flame
// 11k vs 8k on Avade), Fiery Brand on two charges (48s recharge fits four
// players exactly) and Felblade. Nobody plays Aldrachi Reaver, Soul Carver
// or Frailty (no Frailty debuff in any log); Painbringer shows on two
// player-pulls only.
//
// ── Sigils (tracked-cooldowns.ts, sigilValue) ──────────────────────────
// Sigil of Flame (cast 204596) hits as 204598, Sigil of Spite (390163) as
// 389860, so perUse read 0 and the drift check never reported. Shortest
// intervals over the 24 player-pulls: Sigil of Flame 30.0s (171, median
// 32.8s), Sigil of Spite 60.2s (83, median 65.8s); the old 31s / 63s were
// one player's. A hit before the first cast is a pre-pull press (Supadh,
// Avade, Xkito open that way). A use is worth its hits (to the next cast
// or 20s) less the average GCD a held sigil's GCD went to: Sigil of Flame
// 108–285k a cast (Vashnik's Venoms make it 9-target), Sigil of Spite
// 132–412k, against 52–78k GCDs. burstHold: Supadh pressed Sigil of Flame
// 1–9s after three of the five Imbibes (1:52, 3:11, 6:09; 9 targets each).
// Measured (lost a pull): Avade 81k + 66k, Xkito 82k + 192k, Thanquiol
// 48k; Elruth 407k (ready 3:23, pressed 5:15 with every GCD filled by
// Fracture and Soul Cleave at 80–120 Fury), Supadh 560k (skipped the 4:36
// Imbibe, held 3:42 → 6:09), Felsky 426k. Weaker: Chajinadh 524k + 178k,
// Tormfella none, Misohornie 64–101k Sigil of Flame on 4 of 16 pulls (he
// presses it every 30–33s; Ula'tek 2:50) and 337k Sigil of Spite at
// Vashnik Pull 1 (2:12). It fires on
// the top players more than on the static's tank; each is a whole use
// missed (WoWAnalyzer's 90% sigil efficiency flags them too), so it's
// kept as a real, common loss.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Fury at the cap: Fury is not what limits the spenders. Top players cast
//   back-to-back Soul Cleaves at 120 Fury (Elruth 4:48–4:52) and 30–41 of
//   109–121 Fractures at full Fury (Avade 41, Supadh 38); the shared cap
//   check read Avade 2.39M, Supadh 1.05M against Misohornie 1.5–4.05M and
//   Chajinadh 0.44M.
// - Fragments at a Fracture (5+), Spirit Bomb below 5 fragments: the top
//   players do both as often as or more than the weak (Spirit Bomb on 4 or
//   fewer: Avade 13/26, Xkito 8/11, Misohornie 9/23); a 3–4-fragment Spirit
//   Bomb hits 0.8–0.9× a 6-fragment one (pooled medians, noisy).
// - Metamorphosis window (burstGcdFindings): 6–338k a pull, top (Supadh
//   338k) as weak. Metamorphosis is the spec's big window (damage rate
//   ×1.8–3.2 inside it, 40–58% of the pull) and comes mostly from
//   Untethered Rage (1270476), a 12s proc a Metamorphosis cast spends:
//   one expiry in 24 player-pulls (Tormfella 4:24), and Avade waits ~8s
//   on each one. Not a proc check: the cast itself deals nothing.
// - Fel Devastation held: ~163k a press for its 2s channel (Avade) against
//   two ~66k GCDs, so ~+30k a use; Supadh pressed it once in 6:26, Felsky
//   twice. Fiery Brand held: under one 48s recharge on everyone (0–36s).

import type { PlayerInfo } from "@/types/PlayerInfo";
import { k } from "./shared";

const SIGIL_SPAN_MS = 20_000;

/**
 * One sigil use's worth: its hits (logged under another id than the cast,
 * matched by name) from the cast to the next cast of it or SIGIL_SPAN_MS,
 * averaged over the casts, less the player's average GCD that a held
 * sigil's GCD went to instead.
 */
export function sigilValue(name: string, castId: number) {
  return (player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined => {
    const casts = player.casts.filter((c) => !c.fake && c.abilityId === castId && c.timestamp < endMs).map((c) => c.timestamp).sort((a, b) => a - b);
    if (casts.length < 2) return undefined;
    const hits = player.damageDone.filter((e) => !e.pet && e.abilityName === name && e.timestamp < endMs);
    const total = casts.reduce((a, t, i) => a + hits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(casts[i + 1] ?? Infinity, t + SIGIL_SPAN_MS))
      .reduce((b, e) => b + (e.amount ?? 0), 0), 0);
    const own = total / casts.length;
    const value = own - gcdValue;
    if (!(value > 0)) return undefined;
    return { value, basis: `(${k(own)} a ${name}, its hits over ${casts.length} casts, − ${k(gcdValue)} average GCD in its place)` };
  };
}
