// lib/damage/wow/specs/arcane.ts
//
// Arcane Mage's own checks, beside the shared ones ranged.ts gives it (Arcane
// Surge window; the tracked Touch of the Magi and Arcane Surge cooldowns).
// Built in the WoWAnalyzer audit's phase 3 (docs/wowa-audit/mage-arcane.md),
// every rule valued as damage lost. Measured 2026-10-17 on 31 Arcane Mages
// already on disk, all Mythic: the top Entombed Sentinels parses Padflash
// and Odymage (VWMbYPRyxCAmhZFj), Laku and Tanku (baRCnPv62YQ1dJZN), Capwni
// (LckJC7GMhQvD6rdw), Fujiapplez and Nadlerog (ACmXHMFtaPLR9k8w), Preheat
// (GndQ9VFWtLzNjKpk), Эминли and Нортли (Vr8dLPtFYWA4G1yg), Novachrøno
// (JvQpZk3CXj78Dx2f), Thewagon (dG8D9y6WxrfmtgXp); on Vashnik Aleanmagi and
// Hellåblinks (9w3bK4qhrRC82gVX), Moonymagic and Amanja (r9CX1kpRGLmKJH4M),
// Smolwand (hjHXmdnJFwTPpMtK); the weaker Neximage (qpZx3mWaG7gcDdYB, 33rd,
// the case study), Acegoblain (gVDPhzp61Zm29HMw, 14 pulls on six bosses),
// Arcanerak (wWx8B1GPZMLghAyz), Jamwizard and Lavarcane (xN9cWhzbvqTVfrG8),
// Swiftweaver, Badabum, Lilmagin (v8bmgMAdcnBCj9Ya) and the four of
// MLy7nw8kaW1D394Y. Spell ids are from VWMbYPRyxCAmhZFj's masterData.
//
// Talents: all 31 are Sunfury (Spellfire Sphere, Meteorite, Arcane Soul on
// every pull). Nobody takes Presence of Mind; Evocation is never pressed.
// Arcane Orb presses run 0–15 a kill (Fujiapplez 0, Capwni 2, Amanja 1).
//
// ── Touch of the Magi window (touchWindow) ─────────────────────────────
// Touch of the Magi (321507, off the GCD) marks the target for 12.0s, then
// deals a share of the player's damage to it in that time (210833, at the
// end; it also hits enemies nearby). The debuff isn't in the fetched enemy
// stream, so the window is the cast → its burst (cast + 12s when none
// lands). The share measured 20–21% of the player's own (pet-free) damage
// on the target on every window that banked anything, more with a second
// enemy beside it (Hellåblinks 5:38 on Vashnik: 36%). A window whose burst
// banked under MIN_BANKED (an immune target) is left out.
// So an idle GCD inside it costs the gap check's GCD plus that share:
// burstGcdFindings on these windows (channel time past a GCD isn't room
// for one), each missing GCD × the player's average GCD × the window's own
// measured share. The same premium the Arcane Surge window already prices.
// Measured (lost a pull): top Entombed Sentinels players none, all twelve;
// Vashnik Hellåblinks 470k (393k at 5:38: Shimmer and Glide through the
// window), Aleanmagi 68k, Moonymagic 65k. Weaker: Neximage none on the case
// study; Arcanerak 192k (3:58: 6 of 9 GCDs); Envimagus 115k; Swiftweaver
// 60k; Acegoblain 499k over his 14 pulls (237k at Vashnik Pull 5, 5:32: 5
// of 9). A small loss: Arcane rarely idles in Touch.

import type { JobCheck } from "../../types";
import type { PlayerCheckContext } from "../../checks";
import type { Window } from "../../timeline";
import { burstGcdFindings } from "./shared";

const TOUCH = 321507;        // the cast
const TOUCH_BURST = 210833;  // the banked damage, dealt when the debuff ends
const TOUCH_MS = 12_000;
const BURST_SEEN_MS = 12_500;
// A burst under this share banked nothing (an immune target): no premium.
const MIN_BANKED = 0.05;

type TouchWindow = Window & { bonus: number };

/** Each Touch of the Magi: cast → its burst, with the burst's share of the player's own damage on the target in between. */
function touchWindows(ctx: PlayerCheckContext): TouchWindow[] {
  const p = ctx.player;
  const casts = p.casts.filter((c) => !c.fake && c.abilityId === TOUCH && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const rows = casts.map((c) => {
    const burst = p.damageDone.filter((e) => e.abilityId === TOUCH_BURST && e.timestamp > c.timestamp && e.timestamp <= c.timestamp + BURST_SEEN_MS);
    const end = burst.length ? Math.min(...burst.map((e) => e.timestamp)) : c.timestamp + TOUCH_MS;
    const banked = burst.reduce((a, e) => a + (e.amount ?? 0), 0);
    const own = p.damageDone.filter((e) => !e.pet && e.abilityId !== TOUCH_BURST && e.target === c.target && e.timestamp >= c.timestamp && e.timestamp < end)
      .reduce((a, e) => a + (e.amount ?? 0), 0);
    return { startMs: c.timestamp, endMs: end, seen: burst.length > 0, bonus: own > 0 && burst.length ? banked / own : NaN };
  });
  const measured = rows.filter((r) => r.bonus > 0).map((r) => r.bonus).sort((a, b) => a - b);
  const typical = measured.length ? measured[Math.floor(measured.length / 2)] : 0;
  return rows
    .map((r) => ({ startMs: r.startMs, endMs: r.endMs, bonus: r.seen ? r.bonus : typical }))
    .filter((r) => r.bonus >= MIN_BANKED && r.endMs <= ctx.endMs);
}

const touchWindow: JobCheck = (ctx) => {
  const wins = touchWindows(ctx);
  return burstGcdFindings(ctx, {
    statusId: TOUCH, name: "Touch of the Magi",
    windows: () => wins,
    bonus: (_c, w) => wins.find((x) => x.startMs === w.startMs)?.bonus ?? 0,
    bonusBasis: "what Touch of the Magi banked of the player's damage on its target in that window",
    inference: true,
  });
};

export const ARCANE_CHECKS: JobCheck[] = [touchWindow];
