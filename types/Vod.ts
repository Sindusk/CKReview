// Where a VOD's video comes from. "local" is a file picked from the user's
// own disk and played through an object URL: it lives only in the current
// tab and never reaches the server (see docs/local-vod-plan.md and the
// filter in app/page.tsx's persistSession). Absent means "youtube", so
// sessions saved before local VODs existed restore unchanged.
export type VodSource = "youtube" | "local";

// In-memory handle on a local file. `name`/`size`/`lastModified` identify
// the file without reading it.
export type LocalVodFile = {
  objectUrl:    string;   // URL.createObjectURL(file); revoked when the VOD goes away
  name:         string;
  size:         number;
  lastModified: number;
};

export type Vod = {
  id: number;

  source?: VodSource;
  localFile?: LocalVodFile;   // set only when source === "local"

  offset?: number;
  isCalibrated?: boolean;

  player: string;
  class: string;
  role: "Tank" | "Healer" | "DPS";

  // YouTube only — empty for local VODs.
  url: string;
  videoId: string;   // YouTube Video ID
  embedUrl: string;

  raid: string;
  boss: string;
  difficulty: string;

  reportCode?: string;

  uploadedBy: string;
};

export function isLocalVod(vod: Vod): boolean {
  return vod.source === "local";
}
