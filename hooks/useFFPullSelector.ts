// hooks/useFFPullSelector.ts
//
// Shared "which FF pull is this dialog looking at" state for
// StrategyDialog.tsx and MitigationDialog.tsx (both have their own FF-pull
// dropdown, independent of the app's globally-selected pull). Resets to the
// app's current pull EVERY time the dialog opens (2026-07-23, per the
// user's explicit ask — the two dialogs used to only default once and then
// keep whatever was last picked, even across closes) but leaves the user's
// in-dialog pick alone while it stays open, and self-heals if the selected
// pull disappears entirely (e.g. a fresh report import replaces the pull
// list while a dialog happens to be open).

import { useEffect, useMemo, useState } from "react";
import type { Pull } from "@/types/Pull";

export function useFFPullSelector(pulls: Pull[], open: boolean, currentPullId: number | null) {
  const ffPulls = useMemo(
    () => pulls.filter((p) => p.game === "ffxiv" && p.players.length > 0),
    [pulls]
  );

  const [selectedPullId, setSelectedPullId] = useState<number | null>(null);

  // Reset to the app's current pull every time the dialog transitions to
  // open — intentionally only depends on `open`, not `currentPullId`/
  // `ffPulls`, so picking a different pull WHILE the dialog stays open
  // doesn't get stomped on the next render.
  useEffect(() => {
    if (!open) return;
    if (currentPullId !== null && ffPulls.some((p) => p.id === currentPullId)) {
      setSelectedPullId(currentPullId);
    } else {
      setSelectedPullId(ffPulls.length > 0 ? ffPulls[ffPulls.length - 1].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Self-heal if the selection disappears from the pull list entirely.
  useEffect(() => {
    if (selectedPullId !== null && ffPulls.some((p) => p.id === selectedPullId)) return;
    setSelectedPullId(ffPulls.length > 0 ? ffPulls[ffPulls.length - 1].id : null);
  }, [ffPulls, selectedPullId]);

  const selectedPull = ffPulls.find((p) => p.id === selectedPullId) ?? null;

  return { ffPulls, selectedPullId, setSelectedPullId, selectedPull };
}
