// lib/mechanics/ffxiv/dancingmad/replay.ts
//
// Dancing Mad's replay spec (lib/replay/fight-spec.ts). Art, if any, is in
// components/replay-art/dancingmad.tsx. Most of the fight draws straight
// from game data; these are the abilities it gets wrong.

import type { FightReplay, Override } from "@/lib/replay/fight-spec";

const OVERRIDES: Record<number, Override> = {
  // Revolting Ruin III, both hits: a 90° tankbuster cone (user, VOD review
  // 2026-10-17). The game data has the cone but not its angle.
  50179: { angle: 90, style: "tankbuster" },
  50401: { angle: 90, style: "tankbuster" },
  // Blizzard III Blowout 47771 damages nobody: in Mystery Magic II, players
  // stood 16° inside its facing untouched (2T1HzdPKgbhM43am fight 10, 0:54)
  // while 47774, cast with it, hit a player 36° off its facing
  // (yBKPqGwHparm7Tk4 fight 3, 0:55). Drawing it covered the safe quadrant.
  47771: { hidden: true },
  // Towers whose rows carry no omen to say so.
  47806: { style: "tower" },   // The Path of Light (Forsaken)
  47939: { style: "tower" }, 47940: { style: "tower" }, 47941: { style: "tower" },  // Celestriad
};

export const DANCING_MAD_REPLAY: FightReplay = {
  key: "dancingmad",
  game: "ffxiv",
  name: "Dancing Mad",
  overrides: OVERRIDES,
};
