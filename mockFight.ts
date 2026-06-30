import { TimelineEvent } from "./types";

export const mockFight: TimelineEvent[] = [
  { time: 10, label: "Pull starts", type: "mechanic" },
  { time: 42, label: "Player died: bad soak", type: "death" },
  { time: 95, label: "Raid cooldown used", type: "cooldown" },
  { time: 160, label: "Wipe", type: "wipe" }
];