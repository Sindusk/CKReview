// lib/ffl-job-icons.ts
//
// Local path lookups for FFXIV job icons downloaded by
// scripts/download-class-spec-icons.mjs into public/icons/ffxiv/jobs/.
//
// Run the downloader first:
//   node scripts/download-class-spec-icons.mjs
//
// FFXIV has no separate "class" icon from "job" the way WoW does — see the
// comment in lib/player-display.ts — so this is the only icon lookup needed
// on the FFXIV side.

/**
 * Returns the local icon path for an FFXIV job. Downloaded filenames are
 * keyed by the raw PascalCase job name from FF_JOB_BY_NAME ("DarkKnight",
 * "WhiteMage" — see scripts/icon-sources.mjs), but PlayerInfo.className
 * stores the spaced display name instead ("Dark Knight", "White Mage" — see
 * ffl-job-data.ts's `name` field). Stripping whitespace reconstructs the
 * exact PascalCase key since removing the single space in a two-word job
 * name is the only difference between the two forms.
 */
export function getFFJobIcon(jobName: string): string {
  const key = jobName.replace(/\s+/g, "");
  return `/icons/ffxiv/jobs/${key}.png`;
}
