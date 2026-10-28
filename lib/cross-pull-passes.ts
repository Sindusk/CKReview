// The cross-pull passes the app applies after per-pull detection: state
// learned from ALL of a report's pulls (assigned duties, the fallback
// model's profiles, TOP's Pantokrator conga and Party Synergy order,
// Dancing Mad's Black Hole strategy, Graven Image and Wave Cannon layouts),
// then applied to each pull in a fixed order. app/page.tsx learns each
// piece in its own useMemo (so a strategy override recomputes only its
// part) and maps every pull through applyCrossPullPasses to build
// displayPulls; scripts call learnCrossPullState once for the same result
// (.claude/skills/refine-module/tools/pull-errors.js). Why each pass can't
// run at import time: page.tsx's displayPulls comment.

import type { Pull } from "@/types/Pull";
import { applyDutyAssignments, detectDutyAssignments, resolveDutyAssignments, type DutyAssignment, type DutyOverrides } from "@/lib/mechanics/assignments";
import {
  detectBlackHoleStrategy,
  detectMissedAssignedTetherErrors,
  detectClippedByNeighborTetherErrors,
  detectIncorrectBlackHoleDirectionErrors,
  type BlackHoleStrategyId,
  type BlackHoleStrategyResult,
} from "@/lib/mechanics/ffxiv/dancingmad/blackhole-strategy";
import { learnGravenImageLayout, detectGravenImageSpreadErrors, detectGravenImageStackErrors, type GravenImageLayout } from "@/lib/mechanics/ffxiv/dancingmad/graven-image";
import { learnWaveCannonLayout, detectWaveCannonPositionErrors, type WaveCannonLayout } from "@/lib/mechanics/ffxiv/dancingmad/wave-cannon";
import { applyFallback, buildFallbackProfiles, type FallbackProfile } from "@/lib/mechanics/fallback";
import { learnPantokratorConga, applyPantokratorConga, type PantokratorConga } from "@/lib/mechanics/ffxiv/top/pantokrator-conga";
import { learnSynergyOrder, applySynergyOrder, type SynergyOrder } from "@/lib/mechanics/ffxiv/top/synergy-order";

const TOP = "The Omega Protocol";

export type CrossPullState = {
  fallbackProfiles: Map<number, FallbackProfile>;
  dutyAssignments: DutyAssignment[];
  pantokratorConga: PantokratorConga | undefined;
  synergyOrder: SynergyOrder | undefined;
  blackHoleStrategy: BlackHoleStrategyResult | null;
  gravenImageLayout: GravenImageLayout;
  waveCannonLayout: WaveCannonLayout;
};

/** TOP's Pantokrator conga, learned from the report's clean splits. */
export function learnReportConga(pulls: Pull[]): PantokratorConga | undefined {
  return learnPantokratorConga(pulls.map((p) => ({ players: p.players, deathEvents: p.deathEvents, enemyCasts: p.enemyCasts ?? [] })));
}

/** TOP's Party Synergy order; the conga breaks its ties. */
export function learnReportSynergyOrder(pulls: Pull[], conga: PantokratorConga | undefined): SynergyOrder | undefined {
  return learnSynergyOrder(pulls.filter((p) => p.name === TOP).map((p) => ({ players: p.players, deathEvents: p.deathEvents, enemyCasts: p.enemyCasts ?? [], headMarkers: p.headMarkers })), conga);
}

/** Everything the passes need, learned from the report's pulls at once. */
export function learnCrossPullState(
  pulls: Pull[],
  opts: { blackHoleOverrideId?: BlackHoleStrategyId | null; dutyOverrides?: DutyOverrides } = {},
): CrossPullState {
  const pantokratorConga = learnReportConga(pulls);
  return {
    fallbackProfiles: buildFallbackProfiles(pulls),
    dutyAssignments: resolveDutyAssignments(detectDutyAssignments(pulls), opts.dutyOverrides ?? {}),
    pantokratorConga,
    synergyOrder: learnReportSynergyOrder(pulls, pantokratorConga),
    blackHoleStrategy: detectBlackHoleStrategy(pulls, opts.blackHoleOverrideId ?? null),
    gravenImageLayout: learnGravenImageLayout(pulls),
    waveCannonLayout: learnWaveCannonLayout(pulls),
  };
}

/** One pull with the cross-pull errors merged in, as the app displays it. */
export function applyCrossPullPasses(pull: Pull, s: CrossPullState): Pull {
  const base = applyDutyAssignments(applyFallback(pull, s.fallbackProfiles), s.dutyAssignments);
  const conga = s.pantokratorConga && base.name === TOP
    ? { ...base, errors: applyPantokratorConga(base.errors, base.players, base.deathEvents, base.enemyCasts ?? [], s.pantokratorConga) }
    : base;
  const p = s.synergyOrder && conga.name === TOP
    ? { ...conga, errors: applySynergyOrder(conga.errors, conga.players, conga.deathEvents, conga.enemyCasts ?? [], conga.headMarkers, s.synergyOrder) }
    : conga;
  const blackHoleErrors = [
    ...detectMissedAssignedTetherErrors(p, s.blackHoleStrategy),
    ...detectClippedByNeighborTetherErrors(p, s.blackHoleStrategy),
    ...detectIncorrectBlackHoleDirectionErrors(p, s.blackHoleStrategy),
  ];
  const gravenImageErrors = [
    ...detectGravenImageSpreadErrors(p, s.gravenImageLayout),
    ...detectGravenImageStackErrors(p),
  ];
  const waveCannonErrors = detectWaveCannonPositionErrors(p.players, p.deathEvents, s.waveCannonLayout);
  const extra = [...blackHoleErrors, ...gravenImageErrors, ...waveCannonErrors];
  return extra.length === 0 ? p : { ...p, errors: [...p.errors, ...extra] };
}
