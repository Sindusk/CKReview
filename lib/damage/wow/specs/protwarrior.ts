// lib/damage/wow/specs/protwarrior.ts
//
// Protection Warrior's damage model, from the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/warrior-protection.md, 2026-10-17). Mitigation (Shield
// Block, Ignore Pain, Spell Reflection, Shield Wall) is out of scope: only
// damage is judged here. Wired from tank.ts (PROT_WARRIOR_CHECKS). Until
// the survey sweep (game.ts SWEEP_PRESSES, 2026-10-17) the spec had no
// presses at all, so nothing here had been checked before.
//
// Measured on 23 Protection Warrior player-pulls, all Mythic kills: the top
// parses Boost (yAb1xQmDrkgt7Ndf, Entombed Sentinels 100th), Graf
// (V7pckPz4tKHZC6Dq, Vashnik 100th), Enàver (Yfc7pADMwQgR8hXk, Vashnik
// 99.7th) and Sense (mNkHXhaD6Y2tqQTg, Entombed Sentinels 99.7th, and his
// Vashnik kill), fetched for this pass; 山路十八弯 (9rGDw4WB3bv6VmnK,
// Vashnik 92.8th); the weaker Dránash (Z7gYXjnQzR6JkpD8, 25.9th), 蹦嘎
// (7B1wQbjNhgXJDaHC, 13.8th), 积塔 (v6NnRz4KDtYCJ3Mw, 5.5th) and Tittanis
// (kyjBDGFrv3M2HJ6p); and Hoboedd, Kérrìgan, Kilwen (two kills), Enyò,
// Susanivanova, Earthrus, Genxx, Mekhai, 蚀之刻 (two kills), Lebronjames,
// 饭炒蛋 already on disk. Percentiles from WCL's rankings. Spell ids are
// from those logs' masterData.
//
// Talents (casts, buffs, hit ids): 20 of 23 are Mountain Thane (Thunder
// Blast 435222, Lightning Strike 435791, Burst of Power 437121); Kilwen
// (both kills) and Sense on Entombed Sentinels are Colossus (Demolish
// 436358, Colossal Might 440989, Sudden Death on their Executes).
// Everyone presses Avatar, Shield Charge (385952; its 385954 twin and
// hits) and Demoralizing Shout, and takes Devastator (Devastate is never
// pressed; 236282 hits) and Anger Management (the fit below). Rage caps at
// 100 or 130 by talent. Nobody presses Ravager or Champion's Spear:
// Ravager (228920 / 156287) shows up on its own, 2–8 ticks a burst with no
// cast, and Avatar also procs on its own for 6–10s (no cast; 15+ players).
//
// ── Avatar held (avatarDrift) ──────────────────────────────────────────
// Avatar (107574) comes back faster the more Rage is spent. Over the 124
// intervals between two casts, elapsed + Rage spent ÷ 20 has its minimum
// at exactly 90.0s (Susanivanova fqTXM7bjZ1AzPW4a 5:34; p10 90.5, median 95.8);
// ÷ 15 or ÷ 25 put the minimum at 100.1 / 82.3. So 90s less 1s per 20
// Rage, Arms' rule (shared.ts spentCooldownDrift). A use is worth its
// window's bonus read from the hits (11–17% over 17–25s, 158–374k a use
// when forced in a test). Three players press Avatar with each Vashnik
// Imbibe (山路十八弯 0:25, 1:50, 3:12, 4:37, 6:00; Enyò, 积塔), 83–91s
// apart: the context's hold windows excuse that. Measured: none on any of
// the 23 player-pulls. Procced Avatars aren't casts; the pre-pull buff
// test is off, since a procced Avatar before the first cast would read as
// one.
//
// ── Shield Slam held (shieldSlamHeld) ──────────────────────────────────
// "Shield Slam!" (224324) is on the Warrior while Shield Slam is ready
// (its cooldown back or a reset; 1–3s apart on the top players) and goes
// when it's pressed, or after 6.0s (longest span 6.05s of 2,451 gains);
// Shield Slam stays pressable after (积塔 v6NnRz4KDtYCJ3Mw: ran out at
// 5:12.2, Shield Slam at 5:16.4 with no new gain). A run-out means Shield
// Slam sat ready 6s while other presses went out, and every reset in
// that time was wasted. Counted only when a Revenge or Execute (melee, as
// Shield Slam) was pressed after the reset with no Heroic Throw (out of
// range), outside forced time. Lost = the player's average Shield Slam
// less the cheapest of the presses made instead (Revenge, Execute or
// Thunder Clap, each by its hits ÷ casts): one Shield Slam's GCD
// swapped, a lower bound. Measured (lost a pull): every top player none
// (Sense's 0:50 on Entombed Sentinels is in the transition); weaker 积塔
// 97k (5:03, 5:12, 5:39: Thunder Clap and Revenge with Shield Slam
// ready), 蹦嘎 44k (5:09), Mekhai 42k (1:22), Dránash 24k (2:14),
// 山路十八弯 23k (0:44). WoWAnalyzer models the same resets (guessed
// from casts) but grades nothing with them.
//
// ── Rage capped (rageCapped) ───────────────────────────────────────────
// The shared cap check (shared.ts primaryResourceCapFindings). Rage goes
// mostly to mitigation (Ignore Pain 39–65%, Shield Block 16–27%; Revenge
// 13–30%, Execute 0–29%), and the check prices a Rage at the player's
// Revenge / Execute / Impending Victory damage over all Rage spent (~2k),
// Ignore Pain's share included, so it's the average spend, not a
// Revenge's. Anger Management's lost Avatar time isn't counted. It
// separates: top players cast at full Rage 0–3 times a pull (Graf 14k,
// Enàver 27k, Sense 17–27k, Boost none), the weaker up to 38 (Kilwen
// cpdvJRj9g3WAThzx Vashnik 637k: Shield Slam ×18, Thunder Clap ×14;
// 山路十八弯 254k, Earthrus 183k, Kilwen 134k on Entombed Sentinels,
// Susanivanova 101k, 蹦嘎 99k, 蚀之刻 61–76k).
//
// ── Procs (procs.ts) ───────────────────────────────────────────────────
// Thunder Blast (435615, 15s) and Burst of Power (437121, 15s, next
// Shield Slams free) are listed there. Revenge! (5302, a free Revenge,
// 6.0s) isn't: it runs out on the top players as on the weak (Boost 5 a
// pull, Graf 1, Sense 1; Earthrus 6, 蚀之刻 5, Lebronjames 5; 36 of 523
// gains) and only saves a Revenge's 20 Rage. Violent Outburst never runs
// out (0 of 447 removals without a Shield Slam or Thunder Clap). Sudden
// Death was already there (Kilwen 139k, Vashnik 3:53).
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Idle inside Avatar (burstGcdFindings): top 29–172k a pull (Sense on
//   Vashnik 172k), weak 52–533k; it overlaps, and it's the gap check's
//   idle again.
// - Shield Charge drift (45s, shortest 45.0s): 2–99k a pull, Boost 17k.
// - Demolish drift (30s): Sense 495k (held for 10 Colossal Might stacks),
//   Kilwen none. Demolish is a GCD press with a ~1.4s lock (game.ts).
// - Ravager ticks: never pressed. Demoralizing Shout (Thunderlord): its
//   debuff isn't in the fetch, so its damage can't be read.

import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { forcedPart } from "../../timeline";
import { k, primaryResourceCapFindings, spentCooldownDrift } from "./shared";

const AVATAR = 107574;          // the cast and its buff
const SHIELD_SLAM = 23922;
const SHIELD_SLAM_READY = 224324;  // "Shield Slam!": up while Shield Slam is ready, 6.0s
const READY_MS = 6_000;
const EXPIRY_SLACK_MS = 200;
const CONSUME_MS = 300;
const REVENGE = 6572;
const EXECUTE = 163201;
const THUNDER_CLAP = 6343;
const HEROIC_THROW = 57755;
// Presses that need melee range (Shield Slam did too): one of them inside
// the 6s says the Shield Slam could have been pressed.
const MELEE_PRESSES = new Set([REVENGE, EXECUTE]);
// The presses a held Shield Slam's GCD would have replaced.
const OTHER_PRESSES = [REVENGE, EXECUTE, THUNDER_CLAP];

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const avatarDrift: JobCheck = (ctx) => spentCooldownDrift(ctx, {
  name: "Avatar", actionIds: [AVATAR], baseMs: 90_000, resourceType: 1, scale: 10, unitsPerSecond: 20,
  firstUseOffsetMs: 3_000, window: { buffId: AVATAR },
});

const shieldSlamHeld: JobCheck = (ctx) => {
  const ev = (ctx.player.buffs ?? []).filter((b) => b.source === ctx.player.name && b.abilityId === SHIELD_SLAM_READY)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs);
  // A press's worth: its hits by name (Execute hits under 260798, Thunder
  // Clap under 435203 too) ÷ its casts.
  const perPress = (id: number) => {
    const name = casts.find((c) => c.abilityId === id)?.abilityName;
    const n = casts.filter((c) => c.abilityId === id).length;
    if (!name || n === 0) return 0;
    return ctx.player.damageDone.filter((h) => !h.pet && h.abilityName === name && h.timestamp < ctx.endMs)
      .reduce((a, h) => a + (h.amount ?? 0), 0) / n;
  };
  const slam = perPress(SHIELD_SLAM);
  if (!(slam > 0)) return [];
  const moments: Moment[] = [];
  let lost = 0;
  let gain: number | undefined;
  for (const e of ev) {
    if (e.buffStatus === "applied" || e.buffStatus === "refreshed" || e.buffStatus === "stack") { gain = e.timestamp; continue; }
    if (e.buffStatus !== "removed" || gain === undefined) continue;
    const t = e.timestamp, from = gain;
    gain = undefined;
    if (t >= ctx.endMs || t - from < READY_MS - EXPIRY_SLACK_MS) continue;
    if (casts.some((c) => c.abilityId === SHIELD_SLAM && Math.abs(c.timestamp - t) <= CONSUME_MS)) continue;
    if (forcedPart(from, t, ctx.forced).ms > 0) continue;
    // Presses after the reset (the press that gave it doesn't count).
    const inside = casts.filter((c) => c.timestamp > from + CONSUME_MS && c.timestamp <= t);
    if (!inside.some((c) => MELEE_PRESSES.has(c.abilityId)) || inside.some((c) => c.abilityId === HEROIC_THROW)) continue;
    const pressed = OTHER_PRESSES.filter((id) => inside.some((c) => c.abilityId === id)).map((id) => ({ id, v: perPress(id) }));
    const displaced = Math.min(...pressed.map((x) => x.v));
    const value = Math.max(0, slam - displaced);
    if (value <= 0) continue;
    const names = inside.filter((c) => ctx.game.action(c.abilityId)?.onGcd).map((c) => c.abilityName);
    lost += value;
    moments.push({ startMs: from, endMs: t, lostDamage: value,
      detail: `Shield Slam ready ${clock(from)}–${clock(t)} and not pressed: ${names.join(", ")} instead` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Shield Slam held",
    lostDamage: lost,
    basis: `${moments.length} × (${k(slam)} average Shield Slam − the cheapest press made instead, each at its average)`,
    detail: `Shield Slam! ran out (6s ready, unpressed) ${moments.length} time${moments.length > 1 ? "s" : ""} while other melee presses went out: ${moments.map((m) => clock(m.endMs)).join(", ")}`,
    moments,
  })];
};

const rageCapped: JobCheck = (ctx) => primaryResourceCapFindings(ctx);

export const PROT_WARRIOR_CHECKS: JobCheck[] = [avatarDrift, shieldSlamHeld, rageCapped];
