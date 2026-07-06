// lib/ability-icons.ts
//
// Resolves the raw `icon` filename returned by WCL/FFLogs' masterData.abilities
// (and, for FFLogs, sometimes inline on the event itself as `ability.abilityIcon`)
// into a real, displayable image URL.
//
// Both games serve these off RPGLogs' shared asset CDN under a per-game
// abilities folder — confirmed via scripts/test-ability-icon-urls.mjs against
// real filenames pulled from the project's sample JSONs, including WCL's
// occasional relative-path form ("../../warcraft/abilities/x.jpg"), which
// resolves correctly via the native URL() constructor against the base below.

const WCL_ABILITY_ICON_BASE = "https://assets.rpglogs.com/img/warcraft/abilities/";
const FFL_ABILITY_ICON_BASE = "https://assets.rpglogs.com/img/ff/abilities/";

function resolveIconUrl(base: string, icon: string | undefined | null): string | undefined {
  if (!icon) return undefined;
  try {
    return new URL(icon, base).href;
  } catch {
    return undefined;
  }
}

export function getWCLAbilityIconUrl(icon: string | undefined | null): string | undefined {
  return resolveIconUrl(WCL_ABILITY_ICON_BASE, icon);
}

export function getFFAbilityIconUrl(icon: string | undefined | null): string | undefined {
  return resolveIconUrl(FFL_ABILITY_ICON_BASE, icon);
}
