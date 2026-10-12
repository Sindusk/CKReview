// lib/mitigation/tanking.worker.ts
//
// Runs the Tanking search (tanking-plan.ts buildTankingPlan) off the main
// thread, like plan.worker.ts: 0.1-0.8s on a 5-pull window (Red Hot and
// Deep Blue, Vamp Fatale, 2026-10-11). components/MitigationDialog.tsx
// posts the window and keeps only the reply to its latest request.

import { buildTankingPlan, type TankWindowPull, type TankingPlan } from "./tanking-plan";
import { FFXIV_MITIGATION } from "./ffxiv-catalog";

export type TankingRequest = { id: number; window: TankWindowPull[] };
export type TankingReply = { id: number; plan?: TankingPlan; error?: string };

const ctx = self as unknown as { onmessage: ((e: MessageEvent<TankingRequest>) => void) | null; postMessage: (m: TankingReply) => void };

ctx.onmessage = (e) => {
  const { id, window } = e.data;
  try {
    ctx.postMessage({ id, plan: buildTankingPlan(window, FFXIV_MITIGATION) });
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
