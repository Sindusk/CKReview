"use client";

/**
 * Fractured Crystal severity icon set — the single source of truth for how
 * Death / Raid / Major / Minor errors are marked everywhere in the app
 * (replaces the old 💀 / 🚨 / ⛔ / ⚠️ emoji, which rendered inconsistently
 * across platforms and couldn't be recolored).
 *
 * The visual language: one crystal shard is the unit of severity. Minor is an
 * intact shard with a single fracture through it; Major is that same shard
 * cleaved in two; Raid is the eight-person formation shattering outward around
 * a core shard. Death keeps the skull.
 *
 * Drawn on a 24x24 grid and filled with `currentColor`, so callers set the
 * color via the surrounding `color` style (or the `color` prop) and the icon
 * follows — including the "hasn't happened yet" dimming in the feed.
 */

export type SeverityKind = "Death" | "Raid" | "Major" | "Minor";

/**
 * Palette from the design doc. Slightly warmer/lower-chroma than the Tailwind
 * defaults the app used before, tuned to read at 16px on the dark feed rows.
 */
export const SEVERITY_COLOR: Record<SeverityKind, string> = {
  Death: "#e05a5a",
  Raid: "#b07ce8",
  Major: "#ef8a3c",
  Minor: "#e3c34a",
};

const PATHS: Record<SeverityKind, React.ReactNode> = {
  Death: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 2.4c-4 0-6.9 2.9-6.9 6.9 0 2.3 1 4 2.4 5v4.2c0 .7.5 1.2 1.2 1.2h6.6c.7 0 1.2-.5 1.2-1.2v-4.2c1.4-1 2.4-2.7 2.4-5 0-4-2.9-6.9-6.9-6.9Zm-2.5 5.9a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Zm5 0a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM12 12.7l-1.1 2.1h2.2Zm-1.6 3.2h-.9v3.8h.9Zm3 0h-.9v3.8h.9Z"
    />
  ),
  Major: (
    <>
      <path fill="currentColor" d="M11 2.2 4.5 9.2l2.9 12h3.3l-1.3-4.6 1.7-3.2-1.7-3.8Z" />
      <path fill="currentColor" d="M13.8 2.7 19.5 9.2l-2.9 12h-3.5l-1.2-4.5 1.7-3.2-1.6-3.8Z" />
    </>
  ),
  Minor: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 2.2 18.8 9.1 16.5 21.2H7.5L5.2 9.1Zm1.5 3.1L8.3 11l2.6 5.6h2.1L10.4 11l3.1-5.7Z"
    />
  ),
  Raid: (
    <>
      <path fill="currentColor" d="M12 7.1 14.9 10.4 14 16.9h-4l-.9-6.5Z" />
      <path
        fill="currentColor"
        d="M12 1.6 14 3.6 12 5.6 10 3.6ZM17.9 4 19.9 6 17.9 8 15.9 6ZM20.3 9.9 22.3 11.9 20.3 13.9 18.3 11.9ZM17.9 15.8 19.9 17.8 17.9 19.8 15.9 17.8ZM12 18.2 14 20.2 12 22.2 10 20.2ZM6.1 15.8 8.1 17.8 6.1 19.8 4.1 17.8ZM3.7 9.9 5.7 11.9 3.7 13.9 1.7 11.9ZM6.1 4 8.1 6 6.1 8 4.1 6Z"
      />
    </>
  ),
};

export function SeverityIcon({
  kind,
  size = 16,
  color,
  style,
}: {
  kind: SeverityKind;
  size?: number;
  /** Defaults to `currentColor` so the icon inherits the surrounding text color. */
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={kind}
      style={{ color, flexShrink: 0, display: "block", ...style }}
    >
      {PATHS[kind]}
    </svg>
  );
}
