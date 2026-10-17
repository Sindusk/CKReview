// lib/damage/wow/specs/shadow.ts
//
// Shadow Priest's own pieces, beside the shared checks ranged.ts gives it
// (the Voidform window, Insanity at the cap, Shadow Word: Pain and Vampiric
// Touch uptime) and the tracked Halo and Voidform cooldowns. Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/priest-shadow.md), every
// rule valued as damage lost. Measured 2026-10-17 on the 45 Shadow
// player-pulls already on disk (36 reports, Mythic Vashnik and Entombed
// Sentinels; none fetched for this pass). Top parses (WCL's Shadow
// ranking): Kleenonean (fh6bLKy12gzWvGCH, Vashnik 99.9th), Parsetumor
// (baRCnPv62YQ1dJZN, Entombed Sentinels 99.7th; also Vashnik), Loyalxdice
// and Arthaz (Kag91qVZ2YJ7MQAb, Vashnik 99.4th / 98.6th), Liaisa
// (LckJC7GMhQvD6rdw, 99.2nd), Adeliya (ZC7YNpr2HVQLtjv1, 99.1st), Twicks
// (1nWG9c7t4qHLDmYy, 98.8th), Флоусенх (7L3RKpavDA8T4MjY, Vashnik
// 98.8th), Nosmite (aZ6NnwL8g9PdpGJ1, 98.5th), Roccorpii
// (PAgdKqkXDTRfLnJy, 98.2nd); weak: Unbread (kZnVcJYpKFRChTzb, Vashnik
// 6.7th), Lulousek (6kHtGaQXCMWYxFpZ, 16.9th), 无梦之梦
// (MaWQwnygjkh1czL8, 17.5th), and lower-DPS players of unranked
// percentile (Twistednun ZvrLTQfk1zbAXMwB, Tøunsí C4Kxpn3FtrvjWMAP,
// Tylithia RwxWC6PF2pJ7Zd9H, Finetty / Tetervinas v8bmgMAdcnBCj9Ya).
// Spell ids are from those logs' masterData.
//
// Talents (casts and buffs): all 45 are Archon (Halo 120644 with Power
// Surge and Sustained Potency; no Void Torrent, Void Blast or Entropic
// Rift on anyone), and all take Voidform with Ancient Madness, Insidious
// Ire, Surge of Insanity (Mind Flay: Insanity), Crushing Void, Tentacle
// Slam, Idol of Y'Shaarj and Thing from Beyond. Three 20th-percentile
// Vashnik Shadows probed (Relaxcutt aT7GqzfcbNCAW8D2, Mazzp
// 7DwYjHR9h64Ga81t, Pwnerpriest tQ2nvXkGADbPyBfz) are Archon too, so the
// Voidweaver rules can't be measured. Nobody presses a Shadowfiend or
// Voidwraith: the Shadowfiend (buff 1280172) comes 5s at a time on its own.
// Shadowy Insight and Mind Devourer were not on any of the 45.
//
// Engine (game.ts CHANNEL_TICKS): Mind Flay (6 ticks) and Mind Flay:
// Insanity (4) tick at T, 2T …, and a clip's lock now runs to the next
// press. 1,083 of 1,516 Mind Flays are clipped, the next press 0.25s after
// the last tick at the median; read to the last tick, Kleenonean's GCD
// delays and drift came to 2.22M a pull, 0.91M after.
//
// ── Voidform drift: a use's worth (voidformValue) ─────────────────────
// Voidform (cast 228260, buff 194249) is tracked at 120s but deals nothing
// under its own id, so a lost use was worth 0 and its drift never showed.
// What a window adds, measured on all 45: inside it the player presses
// more Void Volleys (Voidform grants three charges, Tentacle Slam adds one:
// 9–12 a minute inside against 5–6 outside), Mind Flay: Insanity (7 against
// 2.5) and Shadow Word: Madness (12 against 8, from the window's
// Insanity). Each extra press is worth its own damage (hits by name, per
// cast: Void Volley 160–276k, Mind Flay: Insanity 164–317k, Madness
// 174–270k) over the Mind Flay it displaces (42–134k a press). Per use:
// 0.51–1.96M, median ~1.05M (top Kleenonean 1.57M, Parsetumor 1.20–1.41M,
// Liaisa 1.05M; weak Lulousek 0.77M, 无梦之梦 0.92M). The per-hit bonus
// inside the window (non-crit medians) reads −11% to +42% and the raw
// damage rate ×1.5–3.4, both carrying the Power Infusion, potions and
// Halo lined up with it, so neither is used: this is a floor.
// Voidform and Halo are burstHold: the Vashnik top players press both at
// each Imbibe (Kleenonean 0:23, 3:11, 5:58; Twistednun the same), which
// the context's hold windows excuse. With them, no Voidform use is lost on
// any of the 45 (the Entombed Sentinels holds fall in Stasis).
//
// Halo (tracked at 60s) hits under 390964, not its cast id, so a use was
// worth 0 too; with damageIds a use is its hits (Power Surge's echoes
// included) less a GCD. Players who cast it before the pull (Liaisa,
// Lulousek: first press at 1:00) are seen from a hit before the first cast.
// It fires on one player of 45: Флоусенх (7L3RKpavDA8T4MjY, 98.8th), 803k,
// ready 2:25 and 5:09, pressed at the next Imbibe hold (3:07, 5:59), 35s
// held outside the hold windows: one more Halo fitted before the 6:45 kill.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Insidious Ire (373213, a buff on the player while the three DoTs are
//   up): Mind Blast, Void Volley and Mind Flay: Insanity damage dealt
//   without it is 3–7% of theirs over all 45, and at the talent's bonus
//   (12.5% a rank) the loss is fight-driven: top Parsetumor on Vashnik 18%
//   of Void Volley without it (~0.9M at 25%), Флоусенх ~0.8M, Kleenonean
//   ~0.5M, while the Entombed Sentinels top players read 9–108k; weak
//   Unbread ~0.5M, Lulousek ~0.4M. Vashnik's adds drop it for everyone.
// - Voidform cut short of its extension (Ancient Madness): windows run
//   35.5s, the first of a pull 31.5s (30.0–31.5 on everyone); short ones
//   outside the kill are 1.5–4s on 8 of 45 player-pulls, top included
//   (Parsetumor Vashnik 2:06 31.5s, Muddpriest 34.0s). At ~30k a second
//   (a use's worth over its window) that's 45–120k.
// - Void Volley charges lost at Voidform's end: none left on a Voidform
//   end; 0–2 a pull removed without a press, almost all a Tentacle Slam
//   charge gained 0.0–1.5s before the window closed, top players too
//   (Muddpriest 2, Adeliya, Nosmite, Arthaz 1). ~120k each at most.
// - Shadow Word: Madness uptime: gaps with Insanity for it (50) read
//   0.04–1.47M a pull at Madness's damage per second, top as much as weak
//   (Флоусенх 1.47M, Parsetumor Vashnik 0.87M, Kleenonean 0.87M; 无梦之梦
//   1.26M, Unbread 0.77M). Holding Insanity shifts Madness rather than
//   losing it; what's lost is Insanity at the cap (the shared check).
// - Mind Flay: Insanity (391401) running out: 4 of 985 removals had no
//   press beside them, one at 30.01s; not added to procs.ts.
// - Tentacle Slam that hit nothing: 9 of 1,244 casts, top players too,
//   three of them pull openers.
// - Mind Blast held: no cooldown fits (shortest intervals 2–7s, medians
//   7.7–10.1s on the top players), so held time can't be rebuilt. A lead:
//   Lulousek 3.6 a minute, Hamiltony and Líme 3.7–4.0 (nhbCYHXRf1T2qAv9),
//   top players 4.7 (Флоусенх, Vashnik) to 7.8.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck } from "../../types";
import { inWindows, statusWindows } from "../../timeline";
import { k } from "./shared";

const VOIDFORM = 194249;          // the buff (the cast is 228260)
const VOID_VOLLEY = 1242173;
const MF_INSANITY = 391403;
const MADNESS = 335467;
const MIND_FLAY = 15407;
const EXTRA_PRESSES: [number, string][] = [
  [VOID_VOLLEY, "Void Volley"], [MF_INSANITY, "Mind Flay: Insanity"], [MADNESS, "Shadow Word: Madness"],
];

/** Damage per press of a cast id, its hits matched by name. */
function perPress(p: PlayerInfo, id: number, name: string, endMs: number): number {
  const n = p.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs).length;
  if (n === 0) return 0;
  return p.damageDone.filter((e) => !e.pet && e.abilityName === name && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / n;
}

/**
 * One Voidform (tracked-cooldowns.ts): the Void Volleys, Mind Flay:
 * Insanities and Shadow Word: Madnesses its window adds over the player's
 * rate outside it, each worth its own press over a Mind Flay.
 */
export function voidformValue(p: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const wins = statusWindows(p, new Set([VOIDFORM]), endMs).filter((w) => w.endMs < endMs);
  if (wins.length === 0) return undefined;
  const inMs = wins.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const outMs = endMs - inMs;
  if (outMs <= 0) return undefined;
  const filler = perPress(p, MIND_FLAY, "Mind Flay", endMs);
  let value = 0;
  const parts: string[] = [];
  for (const [id, name] of EXTRA_PRESSES) {
    const casts = p.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs);
    const inside = casts.filter((c) => inWindows(c.timestamp, wins)).length;
    const extra = (inside - (casts.length - inside) / outMs * inMs) / wins.length;
    const each = perPress(p, id, name, endMs) - filler;
    if (!(extra > 0) || !(each > 0)) continue;
    value += extra * each;
    parts.push(`${extra.toFixed(1)} ${name} × ${k(each)}`);
  }
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use: the presses a window adds over the rate outside (${parts.join(", ")}; each its own damage over a ${k(filler)} Mind Flay)`,
  };
}

export const SHADOW_CHECKS: JobCheck[] = [];
