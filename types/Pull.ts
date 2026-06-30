import type { DeathEvent } from "@/types/DeathEvent";

export type PullCastEvent = {
  timestamp: number;
  sourceId: number;
  sourceName: string;
  sourceClass: string;
  role: "Tank" | "Healer" | "DPS";
  abilityId: number;
  abilityName: string;
};

export type Pull = {
  id: number;
  name: string;
  startTime: number;    // seconds from VOD start
  endTime: number;      // so you know pull duration
  result: "Wipe" | "Kill";
  fightDuration: number; // actual fight length in ms (from logs)
  deathEvents: DeathEvent[];
  castEvents?: PullCastEvent[];
};