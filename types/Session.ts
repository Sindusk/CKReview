// types/Session.ts
//
// Shape of a saved session — just enough to reopen where you left off:
// the log URL (re-typed into the import box, never auto-submitted), the
// VODs (with calibration offset if one exists), and any manually-called
// wipe timestamps, keyed by fightId so they survive a re-import.

export type SavedSessionVod = {
  player:  string;
  url:     string;
  offset?: number;   // present only if this VOD was calibrated
};

export type SavedSession = {
  createdAt: number;                  // used to pick the "earliest" session on duplicate-log lookup
  reportUrl: string;
  vods:      SavedSessionVod[];
  wipeCalls: Record<number, number>;  // fightId -> timestampMs
};