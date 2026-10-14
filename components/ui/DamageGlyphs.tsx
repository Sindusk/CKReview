// components/ui/DamageGlyphs.tsx
//
// The Damage dialog's coaching-theme glyphs (lib/damage/coaching.ts): one
// small SVG and one colour per theme, used on the Biggest wins cards, the
// finding group headers and the timeline's loss dots. Stroke/fill take
// currentColor, so the colour goes in through `color`. Also the contrast
// lift for job colours used as text.

import type { CSSProperties } from "react";
import type { CoachingTheme } from "@/lib/damage/coaching";

// Distinct from the timeline's raid-buff gold, tincture violet and
// movement blue.
export const THEME_COLOR: Record<CoachingTheme, string> = {
  gcd:       "#ff7a6b",
  burst:     "#c99bff",
  uptime:    "#4fd1c5",
  resources: "#f2c94c",
  healing:   "#7fdc8a",
  death:     "#ff4d79",
};

const PATHS: Record<CoachingTheme, React.ReactNode> = {
  gcd: (
    <>
      <path d="M12 3a9 9 0 1 1-8.5 6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M3 4v5h5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  burst: (
    <>
      <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" fill="currentColor" />
      <circle cx="19.5" cy="4.5" r="1.6" fill="currentColor" />
    </>
  ),
  uptime: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth={2.2} />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  resources: (
    <>
      <rect x="5" y="6" width="14" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth={2.2} />
      <rect x="8" y="11" width="8" height="7" fill="currentColor" />
      <path d="M12 1.5c1.6 2 1.6 3.2 0 4.3-1.6-1.1-1.6-2.3 0-4.3z" fill="currentColor" />
    </>
  ),
  healing: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor" />,
  death: (
    <>
      <path d="M12 2.5c-5 0-8 3.4-8 7.7 0 2.7 1.3 4.4 3 5.4V20h10v-4.4c1.7-1 3-2.7 3-5.4 0-4.3-3-7.7-8-7.7z" fill="currentColor" />
      <circle cx="8.8" cy="10.5" r="2" fill="var(--ck-bg-deep)" />
      <circle cx="15.2" cy="10.5" r="2" fill="var(--ck-bg-deep)" />
      <path d="M10 20v-3M14 20v-3" stroke="var(--ck-bg-deep)" strokeWidth={1.5} />
    </>
  ),
};

/** The theme's glyph in a tinted disc. */
export function ThemeGlyph({ theme, size = 24, style }: { theme: CoachingTheme; size?: number; style?: CSSProperties }) {
  const color = THEME_COLOR[theme];
  return (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: "50%", flex: "0 0 auto", display: "inline-grid", placeItems: "center",
      color, background: `color-mix(in srgb, ${color} 16%, transparent)`, ...style,
    }}>
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)}>{PATHS[theme]}</svg>
    </span>
  );
}

// ── Readable job colours ─────────────────────────────────────────────────
// Some job colours (Gunbreaker, Ninja, Warrior) fall under 4.5:1 on the
// dark cards: as text they're mixed toward white until they reach it.
// Swatches and bars keep the original.
const CARD_BG = "#12161a";
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mix = (hex: string, t: number) => "#" + [1, 3, 5].map((i) => {
  const v = parseInt(hex.slice(i, i + 2), 16);
  return Math.round(v + (255 - v) * t).toString(16).padStart(2, "0");
}).join("");
const readableCache = new Map<string, string>();
export function readableText(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  let out = readableCache.get(color);
  if (out) return out;
  out = "#ffffff";
  for (let t = 0; t <= 1; t += 0.04) {
    const c = mix(color, t);
    if (contrast(c, CARD_BG) >= 4.5) { out = c; break; }
  }
  readableCache.set(color, out);
  return out;
}
