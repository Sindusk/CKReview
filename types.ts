export type TimelineEvent = {
  time: number;      // seconds into fight/video
  label: string;
  type: "death" | "cooldown" | "mechanic" | "wipe" | "note";
  source?: "manual" | "warcraftlogs";
};