// Where a VOD's video comes from. "local" is a file picked from the user's
// own disk and played through an object URL: it lives only in the current
// tab and never reaches the server (see docs/archive/local-vod-plan.md and the
// filter in app/page.tsx's persistSession). "twitch" is a Twitch VOD
// (twitch.tv/videos/ID); sessions save only its URL, and restore tells it
// from YouTube by parsing that. Absent means "youtube", so sessions saved
// before other sources existed restore unchanged.
export type VodSource = "youtube" | "local" | "twitch";

// In-memory handle on a local file. `name`/`size`/`lastModified` identify
// the file without reading it.
export type LocalVodFile = {
  objectUrl:    string;   // URL.createObjectURL(file); revoked when the VOD goes away
  name:         string;
  size:         number;
  lastModified: number;
};

// From this report time (seconds, a synced pull's startTime) onward, video
// time = report time + offset. See lib/vod-sync.ts.
export type SyncPoint = {
  fromTime: number;
  offset:   number;
};

export type Vod = {
  id: number;

  source?: VodSource;
  localFile?: LocalVodFile;   // set only when source === "local"

  // Sync (lib/vod-sync.ts). `syncPoints` is the source of truth; `offset`
  // (the first point's offset) and `isCalibrated` (any point exists) are
  // kept in step by withSyncPoints() for callers that only ask "is it
  // synced". VODs from older sessions have only `offset`.
  syncPoints?: SyncPoint[];
  offset?: number;
  isCalibrated?: boolean;

  // Video length in seconds, recorded the first time the player reports
  // it. Undefined until then (coverage then checks only the start).
  durationSec?: number;

  player: string;
  class: string;
  role: "Tank" | "Healer" | "DPS";

  // YouTube and Twitch — empty for local VODs.
  url: string;
  videoId: string;   // YouTube video ID, or the numeric Twitch VOD ID
  embedUrl: string;  // YouTube only: Twitch's embed needs the page's host, known at play time

  raid: string;
  boss: string;
  difficulty: string;

  reportCode?: string;

  uploadedBy: string;
};

export function isLocalVod(vod: Vod): boolean {
  return vod.source === "local";
}

export function isTwitchVod(vod: Vod): boolean {
  return vod.source === "twitch";
}
