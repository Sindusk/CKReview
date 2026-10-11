// types/Session.ts
//
// Shape of a saved session — just enough to reopen where you left off:
// the log URL (re-typed into the import box, never auto-submitted), the
// VODs (with calibration offset if one exists), and any manually-called
// wipe timestamps, keyed by fightId so they survive a re-import.

export type SavedSessionVod = {
  player:  string;
  url:     string;
  // Present only if this VOD was calibrated: the first sync point's
  // offset, still written so an older client can read the session.
  offset?: number;
  // Every sync point (lib/vod-sync.ts). Absent in sessions saved before
  // re-sync existed; restore then builds one point from `offset`.
  syncPoints?:  { fromTime: number; offset: number }[];
  durationSec?: number;   // video length, once the player has reported it
};

// A manually-added error, serialized for storage. `player` is stored as a
// name only — class/specId/role are re-looked-up from the freshly-imported
// roster on reapply (see lib/session.ts applyPendingManualErrors), same
// spirit as wipeCalls being keyed by fightId rather than baked into the
// Pull object directly.
export type SavedManualError = {
  id:          string;
  severity:    "Major" | "Minor" | "Raid";
  name:        string;
  description: string;
  timestamp:   number;
  player?:     string;
};

export type SavedSession = {
  createdAt: number;                  // used to pick the "earliest" session on duplicate-log lookup
  reportUrl: string;
  vods:      SavedSessionVod[];
  wipeCalls: Record<number, number>;  // fightId -> timestampMs
  manualErrors: Record<number, SavedManualError[]>;  // fightId -> manual errors
};