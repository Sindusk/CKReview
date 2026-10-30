// components/LegalPage.tsx
//
// Shell for the plain-text policy pages (app/privacy, app/terms). Google
// requires a public home page, privacy policy and terms of service on the
// authorized domain before the shared Google sign-in (lib/google-auth.ts)
// can be published, and they cover every consistencykings.com app that
// uses the shared account, not just this one.

import type { ReactNode } from "react";

export const CONTACT_URL = "https://github.com/Sindusk/CKReview/issues";
export const LAST_UPDATED = "October 29, 2026";

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth:   "760px",
        margin:     "0 auto",
        padding:    "40px 16px 80px",
        color:      "var(--ck-text)",
        lineHeight: 1.6,
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <p style={{ margin: 0 }}>
        <a href="/" style={{ color: "var(--ck-arcane-text)" }}>← Consistency Kings</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-cinzel), serif", color: "var(--ck-text-gold)" }}>{title}</h1>
      <p style={{ opacity: 0.7 }}>Last updated {LAST_UPDATED}</p>
      {children}
    </main>
  );
}
