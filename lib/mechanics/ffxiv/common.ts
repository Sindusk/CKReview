// lib/mechanics/ffxiv/common.ts
//
// General rules that apply to every FFXIV fight, whatever the boss. Entry
// point: detectFFCommonErrors, run once per FF pull after the boss modules
// (lib/log-transforms.ts; validate.js mechanic "ff-common"). Add new
// fight-independent rules here, each with its own ruleId.
//
// -- ffxiv-healers-dead --
// Both healers dead at once ends the pull, unless a Red
// Mage or Summoner can raise them (user, 2026-10-14: "The moment both healers
// are dead and there is no Red Mage or Summoner in the group, the pull is
// over"; Lindwurm II report AYQm9Kd8Ct4FxcGp Pull 16, where the errors after
// 1:05 were the pull already ending). A player-less Raid marker at the moment
// the second healer died, which makes it the cutoff when nothing earlier is.
// A kill means the boss died without them, so it never fires there.
// Not when both are raised again afterwards (a raise cast before the second
// healer died, then that healer raised in turn): the pull goes on (user,
// 2026-11-25, 6GDBJ1WY8br7zCHk Pull 5 14:31, Dancing Mad). Matches 3 of ~550
// both-dead moments across the ff reports on disk; a pending raise alone
// (~35, mostly real wipes) is not enough.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError } from "@/types/PullError";
import { joinNames, raidMarker, rezzedAt } from "@/lib/mechanics/wow/common";

export const FF_HEALERS_DEAD_RULE_ID = "ffxiv-healers-dead";

// Jobs that can raise without a healer.
const RAISERS = /red ?mage|summoner/i;
// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;

/** Every general FFXIV rule for one pull. */
export function detectFFCommonErrors(players: PlayerInfo[], deaths: DeathEvent[], isKill = false): PullError[] {
  return [
    ...detectHealersDead(players, deaths, isKill),
  ];
}

function detectHealersDead(players: PlayerInfo[], deaths: DeathEvent[], isKill: boolean): PullError[] {
  if (isKill) return [];
  const healers = players.filter((p) => p.role === "Healer");
  if (healers.length < 2 || players.some((p) => RAISERS.test(p.specName))) return [];
  // Each healer's dead windows: from the fatal hit until raised (or the next death).
  const out = healers.map((h) => {
    const own = deaths.filter((d) => d.player === h.name).sort((a, b) => a.timestamp - b.timestamp);
    return own.map((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const rez = rezzedAt(h, d.timestamp, next);
      return { start: d.timestamp - DEATH_EVENT_LAG_MS, end: rez ?? next - DEATH_EVENT_LAG_MS, raised: rez !== undefined };
    });
  });
  const windowAt = (i: number, t: number) => out[i].find((w) => t >= w.start && t < w.end);
  // Both dead, but each is raised afterwards (one healer's raise landed on
  // the other before they too went down): the pull goes on, so that moment
  // is no cutoff (user, 2026-11-25, 6GDBJ1WY8br7zCHk Pull 5 14:31: "They
  // were able to be resurrected in sequence, so the party was able to
  // continue the pull").
  const t = out.flat().map((w) => w.start).sort((a, b) => a - b).find((x) => {
    const ws = healers.map((_, i) => windowAt(i, x));
    return ws.every((w) => w) && !ws.every((w) => w!.raised);
  });
  if (t === undefined) return [];
  return [raidMarker(FF_HEALERS_DEAD_RULE_ID, "Both Healers Dead",
    `Both healers were dead at once (${joinNames(healers.map((h) => h.name))}) with no Red Mage or Summoner to raise them, so nobody could raise. Treated as the cutoff point.`,
    t, 0, "Deaths")];
}
