export type Vod = {
  id: number;

  offset?: number;
  isCalibrated?: boolean;

  player: string;
  class: string;
  role: "Tank" | "Healer" | "DPS";

  url: string;
  videoId: string;   // YouTube Video ID
  embedUrl: string;

  raid: string;
  boss: string;
  difficulty: string;

  reportCode?: string;

  uploadedBy: string;
};