// lib/spec-icons.ts
//
// Local path lookups for WoW class + spec icons downloaded by
// scripts/download-class-spec-icons.mjs into public/icons/wow/.
//
// Run the downloader first:
//   node scripts/download-class-spec-icons.mjs
//
// These are plain public/ paths (not imports), so they work directly in
// <img src={...}> the same way /ckreviewv9.png is used in Header.tsx.

// Downloaded filenames (see scripts/icon-sources.mjs WOW_CLASS_ICON_SLUGS)
// use the properly-spaced display name, e.g. "Death Knight.jpg". Callers may
// pass either that form OR the raw unspaced WCL form ("DeathKnight" — see
// the comment on formatClassName in lib/player-display.ts for why that
// exists), so this normalizes (strip whitespace, lowercase) before matching
// against the known canonical filenames — same pattern as
// lib/class-colors.ts's getClassColor.
function normalizeClassKey(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

const WOW_CLASS_ICON_FILES = [
  "Death Knight", "Demon Hunter", "Druid", "Evoker", "Hunter", "Mage",
  "Monk", "Paladin", "Priest", "Rogue", "Shaman", "Warlock", "Warrior",
];

const WOW_CLASS_ICON_MAP = new Map(
  WOW_CLASS_ICON_FILES.map((name) => [normalizeClassKey(name), name])
);

/**
 * Returns the local icon path for a WoW class. Accepts either the spaced
 * display name ("Death Knight") or the raw unspaced form ("DeathKnight").
 */
export function getWowClassIcon(className: string): string {
  const canonical = WOW_CLASS_ICON_MAP.get(normalizeClassKey(className)) ?? className;
  return `/icons/wow/classes/${canonical}.jpg`;
}

/**
 * Returns the local icon path for a WoW spec, keyed by Blizzard spec ID —
 * matches lib/spec-data.ts SPEC_DATA keys exactly.
 */
export function getWowSpecIcon(specId: number): string {
  return `/icons/wow/specs/${specId}.jpg`;
}
