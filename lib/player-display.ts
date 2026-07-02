// lib/player-display.ts
//
// Combines spec + class/job for display without duplicating text.
// WoW: spec and class are distinct ("Unholy" + "Death Knight").
// FFXIV: specName === className (job doubles as spec) — show it once.

export function formatSpecClass(specName: string, className: string): string {
  if (!specName || specName === className) return className;
  return `${specName} ${className}`;
}