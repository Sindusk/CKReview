import type { ReactNode } from "react";

/*
  Line glyphs on a 24-unit grid, stroked in currentColor: the opening
  screen's step tokens and Import button (OnboardingView) and the toolbar's
  Damage / Mitigation / Strategy buttons. The filled gold icon set for the
  burger menu is MenuIcons.tsx; these are for buttons and small tokens.
*/

export type LineGlyphName =
  | "connect" | "import" | "review" | "upload"
  | "damage" | "mitigation" | "strategy" | "add"
  | "roster" | "clipboard" | "list" | "map";

const GLYPHS: Record<LineGlyphName, ReactNode> = {
  connect: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </>
  ),
  import: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 12h5M10 15h5M10 18h3" />
    </>
  ),
  review: <path d="M9 6.5l9 5.5-9 5.5z" />,
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 14v5h14v-5" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  roster: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3" />
      <circle cx="16.5" cy="9.5" r="2.6" />
      <path d="M16.2 14.3c2.5.1 4.3 1.8 4.8 4.7" />
    </>
  ),
  clipboard: (
    <>
      <path d="M8.5 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-2" />
      <rect x="8.5" y="3" width="7" height="3.2" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" strokeWidth="2.6" />
    </>
  ),
  map: (
    <>
      <path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  damage: (
    <>
      <path d="M4 20h16" />
      <path d="M6.5 20v-6M11 20V8M15.5 20v-9M20 20V5" />
    </>
  ),
  mitigation: (
    <>
      <path d="M12 3l7.5 2.8V11c0 4.6-3.1 8.4-7.5 10-4.4-1.6-7.5-5.4-7.5-10V5.8z" />
      <path d="M12 7.5v9M8.5 11h7" />
    </>
  ),
  strategy: (
    <>
      <path d="M3 5.5c2.7-1 5.5-1 9 1 3.5-2 6.3-2 9-1v13c-2.7-1-5.5-1-9 1-3.5-2-6.3-2-9-1z" />
      <path d="M12 6.5v13" />
    </>
  ),
};

export function LineGlyph({ name, size = 16, strokeWidth = 1.7 }: { name: LineGlyphName; size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {GLYPHS[name]}
    </svg>
  );
}
