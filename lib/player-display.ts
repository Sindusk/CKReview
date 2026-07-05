// lib/player-display.ts
//
// Combines spec + class/job for display without duplicating text.
// WoW: spec and class are distinct ("Unholy" + "Death Knight").
// FFXIV: specName === className (job doubles as spec) — show it once.

// WoW class names are stored unspaced internally (WCLActor.subType comes
// back as e.g. "DeathKnight", "DemonHunter" — see wcl-transforms.ts) since
// that's the raw value from the API and other code (icon lookups, sort
// priority) keys off it consistently either way. This is purely a display
// concern: insert a space before each capital that follows a lowercase
// letter. FFXIV class/job names already have spaces (from ffl-job-data.ts's
// display names) and pass through unchanged — there's never an adjacent
// lowercase-then-uppercase pair with no space between them in those.
export function formatClassName(className: string): string {
  return className.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function formatSpecClass(specName: string, className: string): string {
  const formattedClass = formatClassName(className);
  if (!specName || specName === className || specName === formattedClass) {
    return formattedClass;
  }
  return `${specName} ${formattedClass}`;
}