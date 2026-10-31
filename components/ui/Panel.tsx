import type { CSSProperties, ReactNode } from "react";

/*
  Major panel frame: the gilt border, four corner ornaments and an optional
  centre diamond on the top (and/or bottom) edge. The classes live in
  app/theme.css. Reserve this for the top-level panels of a screen; cards
  inside a panel use .ck-card / .ck-tile / .ck-entry instead.

  The outer element must not clip (the ornaments hang ~5px outside the
  frame), so clipping and the flex column live on the inner body. Callers
  size the panel through `style` and lay out children through `bodyStyle`.
*/
export function Panel({
  children,
  style,
  bodyStyle,
  diamond = true,
  diamondBottom = false,
  variant = "primary",
}: {
  children:       ReactNode;
  style?:         CSSProperties;
  bodyStyle?:     CSSProperties;
  diamond?:       boolean;
  diamondBottom?: boolean;
  /** "support": a supporting panel beside the screen's main one — softer
      border, smaller dimmer corners, no diamonds. The workspace's centre
      (video) panel stays "primary"; Roster, Pull Review, VODs and Pulls are
      "support". */
  variant?:       "primary" | "support";
}) {
  const support = variant === "support";
  return (
    <section className={support ? "ck-panel ck-panel--support" : "ck-panel"} style={style}>
      <div className="ck-panel__body" style={bodyStyle}>{children}</div>
      <span aria-hidden="true" className="ck-corner ck-corner--tl" />
      <span aria-hidden="true" className="ck-corner ck-corner--tr" />
      <span aria-hidden="true" className="ck-corner ck-corner--bl" />
      <span aria-hidden="true" className="ck-corner ck-corner--br" />
      {diamond && !support && <span aria-hidden="true" className="ck-diamond" />}
      {diamondBottom && !support && <span aria-hidden="true" className="ck-diamond ck-diamond--bottom" />}
    </section>
  );
}

/** Title bar for a Panel: Cinzel title on the left, controls/meta on the right. */
export function PanelHeader({
  title,
  count,
  subtitle,
  children,
  shrinkTitle,
  center,
}: {
  title:        ReactNode;
  /** Centred in the header between the title and the controls (the video panel's Video | Replay switch). */
  center?:      ReactNode;
  /** Rendered after the title in muted sans, e.g. "(26)". */
  count?:       ReactNode;
  /** Small sans line under the title. */
  subtitle?:    ReactNode;
  children?:    ReactNode;
  /** Let a long title ellipsize instead of pushing the controls to wrap. */
  shrinkTitle?: boolean;
}) {
  const heading = (
    <h2 className={`ck-panel-title${shrinkTitle ? " ck-panel-title--shrink" : ""}`} title={typeof title === "string" ? title : undefined}>
      {title}
      {count !== undefined && <span className="ck-panel-title__count">{count}</span>}
    </h2>
  );

  if (center) {
    // Three columns so the centre piece stays centred however long the
    // title or the controls are.
    return (
      <div className="ck-panel-header" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)" }}>
        <div style={{ minWidth: 0, display: "flex" }}>{heading}</div>
        <div>{center}</div>
        <div className="ck-panel-meta">{children}</div>
      </div>
    );
  }

  return (
    <div className="ck-panel-header">
      {subtitle ? (
        <div style={{ minWidth: 0, flexShrink: shrinkTitle ? 1 : 0, display: "flex", flexDirection: "column" }}>
          {heading}
          <div className="ck-panel-subtitle">{subtitle}</div>
        </div>
      ) : heading}
      {children && <div className="ck-panel-meta">{children}</div>}
    </div>
  );
}
