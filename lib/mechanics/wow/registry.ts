// lib/mechanics/wow/registry.ts
//
// The one list of per-pull WoW encounter modules. Both the live pipeline
// (transformFightToPull in lib/log-transforms.ts) and the regression harness
// (scripts/validate.js) iterate it, so a new boss is one new module file
// plus one line here:
//
//   { name: "my-boss", detect: detectMyBossErrors },
//
// `name` is the harness mechanic name (`node scripts/validate.js my-boss`)
// and the `mechanic` key of snapshot entries and rulings — never rename one
// without migrating expectations/. Every module self-gates on its own
// encounter's signature, so all of them run on every WoW pull. Order is the
// order errors are collected in (the pipeline sorts them by time after).

import type { PullError } from "@/types/PullError";
import type { WowPullContext } from "./common";
import { detectMidnightFallsErrors } from "./vs-dr-mqd/midnightfalls";
import { detectEntombedSentinelsErrors } from "./va/entombed-sentinels";
import { detectVashnikErrors } from "./va/vashnik";
import { detectSszorakErrors } from "./va/sszorak";
import { detectNekzaliErrors } from "./va/nekzali";
import { detectLostExplorersErrors } from "./va/lost-explorers";
import { detectTwinFangsErrors } from "./va/twin-fangs";
import { detectCoiledAltarErrors } from "./va/coiled-altar";
import { detectUlatekErrors } from "./va/ulatek";

export type WowEncounterModule = {
  name:   string;
  detect: (ctx: WowPullContext) => PullError[];
  /**
   * The harness has a hand-written entry for this module (extra
   * report-level output), so it doesn't generate one.
   */
  customHarness?: boolean;
};

export const WOW_ENCOUNTER_MODULES: WowEncounterModule[] = [
  {
    name: "midnightfalls",
    detect: (c) => detectMidnightFallsErrors(c.players, c.deaths, c.enemyCasts, c.enemyBuffs, c.friendlyNpcDamage),
    customHarness: true,
  },
  { name: "entombed-sentinels", detect: detectEntombedSentinelsErrors },
  { name: "vashnik",            detect: detectVashnikErrors },
  { name: "sszorak",            detect: detectSszorakErrors },
  { name: "nekzali",            detect: detectNekzaliErrors },
  { name: "lost-explorers",     detect: detectLostExplorersErrors },
  { name: "twin-fangs",         detect: detectTwinFangsErrors },
  { name: "coiled-altar",       detect: detectCoiledAltarErrors },
  { name: "ulatek",             detect: detectUlatekErrors },
];

/** Run every registered module on one pull. */
export function detectWowEncounterErrors(ctx: WowPullContext): PullError[] {
  return WOW_ENCOUNTER_MODULES.flatMap((m) => m.detect(ctx));
}
