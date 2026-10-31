import type { ReactNode } from "react";
import { LineGlyph, type LineGlyphName } from "./LineGlyph";

/*
  The centred placeholder a workspace panel shows while it has nothing to
  draw: a large line glyph, a title, one line of direction and an optional
  action. Replaces the small emoji + caption the panels used, which left
  big panels looking empty rather than waiting.
*/
export function EmptyState({ glyph, title, children, action }: {
  glyph:     LineGlyphName;
  title:     string;
  children?: ReactNode;
  action?:   ReactNode;
}) {
  return (
    <div style={{
      flex:           1,
      minHeight:      0,
      height:         "100%",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "10px",
      padding:        "16px 20px",
      textAlign:      "center",
      boxSizing:      "border-box",
    }}>
      <span style={{ color: "var(--ck-text-3)", opacity: 0.85, display: "flex" }}>
        <LineGlyph name={glyph} size={52} strokeWidth={1.3} />
      </span>
      <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "17px", fontWeight: 700, color: "var(--ck-text)", letterSpacing: "0.02em" }}>
        {title}
      </div>
      {children && (
        <div style={{ maxWidth: "280px", fontSize: "13px", lineHeight: 1.5, color: "var(--ck-text-2)" }}>
          {children}
        </div>
      )}
      {action && <div style={{ marginTop: "4px" }}>{action}</div>}
    </div>
  );
}
