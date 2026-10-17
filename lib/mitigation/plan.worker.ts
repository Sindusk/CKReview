// lib/mitigation/plan.worker.ts
//
// Runs the Analysis search (plan.ts buildMitigationPlan) off the main
// thread: on a 5-pull window it takes 0.2-2s (measured 2026-10-11 on Red
// Hot and Deep Blue and Vamp Fatale), too long to block the dialog.
// components/MitigationDialog.tsx posts a request and keeps only the reply
// to its latest one. Only the window's pulls travel in full; the rest of
// the group sends its hits (shield size estimates).

import { buildMitigationPlan, type OptimizedPlan, type WindowPull } from "./plan";
import { ffxivMitigationAt } from "./ffxiv-catalog";
import type { MitigationHit } from "./types";
import type { DebuffReach } from "./debuff-reach";

// `level`: the boss's sync level (lib/damage/ffxiv/patches.ts levelOf).
export type PlanRequest = { id: number; window: WindowPull[]; allHits: MitigationHit[][]; reach?: DebuffReach; level?: number };
export type PlanReply = { id: number; plan?: OptimizedPlan; error?: string };

const ctx = self as unknown as { onmessage: ((e: MessageEvent<PlanRequest>) => void) | null; postMessage: (m: PlanReply) => void };

ctx.onmessage = (e) => {
  const { id, window, allHits, reach, level } = e.data;
  try {
    ctx.postMessage({ id, plan: buildMitigationPlan(window, allHits, ffxivMitigationAt(level), reach) });
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
