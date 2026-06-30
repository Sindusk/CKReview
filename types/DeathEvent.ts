export type DeathEvent = {
  timestamp: number;    // ms into the pull
  player: string;
  class: string;
  role: "Tank" | "Healer" | "DPS";
  cause?: string;       // spell or ability that killed them
};