import type { Metadata } from "next";
import Script from "next/script";
// Cinzel is the display face for the brand banner (BrandBanner.tsx) and
// panel titles (.ck-panel-title); Inter is the UI face for everything else.
// Both are bundled in app/fonts/ and set as --font-cinzel / --font-inter by
// fonts.css, so the build fetches nothing from Google.
import "./fonts.css";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Consistency Kings Raid Review",
  description: "WoW and FFXIV Raid Review",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/*
          Wowhead's official tooltip widget — any <a class="wowhead">
          pointing at wowhead.com/spell={id} gets a full hover tooltip
          (description, cooldown, etc.) for free, no API calls of our own.
          WCL's abilityGameID IS the real WoW spell ID, so RosterPanel /
          AnalysisPanel can link straight to it with no lookup step.
          lazyOnload since tooltips are a hover-only enhancement, not
          needed for first paint. FFXIV has no equivalent widget, so
          ability icons there stay icon-only for now.
        */}
        <Script src="https://wow.zamimg.com/widgets/power.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
