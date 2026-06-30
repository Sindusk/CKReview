import type { AssetType, Game } from "./types";

export type AssetRequest = {
  game: Game;
  type: AssetType;

  /**
   * Either a numeric ID (spell IDs, NPC IDs, etc.)
   * or a human-readable name (Priest, Holy Priest, etc.)
   */
  id?: number | string;

  /**
   * Optional filename override.
   */
  fileName?: string;

  /**
   * Optional extension.
   */
  extension?: string;
};

export default class AssetManager {
  /**
   * Returns the public URL for an asset.
   *
   * Examples:
   * /wow/icons/class/priest.png
   * /wow/icons/spec/holy-priest.png
   * /wow/icons/spell/2061.png
   */
  static getAsset(request: AssetRequest): string {
    const extension = request.extension ?? "png";

    let filename = "";

    if (request.fileName) {
      filename = request.fileName;
    } else if (request.id !== undefined) {
      filename =
        typeof request.id === "number"
          ? request.id.toString()
          : this.slugify(request.id);
    } else {
      filename = "missing";
    }

    return `/${request.game}/icons/${request.type}/${filename}.${extension}`;
  }

  /**
   * Returns a placeholder asset if the requested asset is unavailable.
   */
  static getFallback(game: Game, type: AssetType): string {
    return `/${game}/icons/${type}/missing.png`;
  }

  /**
   * Convenience helper.
   */
  static exists(path: string): string {
    return path;
  }

  /**
   * Converts names into filenames.
   *
   * "Holy Priest" -> "holy-priest"
   * "Death Knight" -> "death-knight"
   * "Augmentation Evoker" -> "augmentation-evoker"
   */
  private static slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}