export type AssetGame = "wow" | "ffxiv";

export type AssetCategory =
  | "class"
  | "spec"
  | "spell"
  | "boss"
  | "encounter"
  | "role";

export interface AssetDescriptor {
  game: AssetGame;

  category: AssetCategory;

  /**
   * Human-readable identifier.
   * Example:
   * "Holy Priest"
   * "Power Word: Shield"
   */
  name: string;

  /**
   * Filename without extension.
   */
  fileName: string;

  /**
   * Where it belongs inside /public
   */
  outputDirectory: string;

  /**
   * Optional numeric identifier.
   * (SpellID, EncounterID, etc.)
   */
  id?: number;

  icon?: string;

  /**
   * Provider-specific metadata.
   * This lets providers carry around extra information
   * without changing the descriptor interface.
   */
  metadata?: Record<string, unknown>;
}