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
}: {
  children:       ReactNode;
  style?:         CSSProperties;
  bodyStyle?:     CSSProperties;
  diamond?:       boolean;
  diamondBottom?: boolean;
}) {
  return (
    <section className="ck-panel" style={style}>
      <div className="ck-panel__body" style={bodyStyle}>{children}</div>
      <span aria-hidden="true" className="ck-corner ck-corner--tl" />
      <span aria-hidden="true" className="ck-corner ck-corner--tr" />
      <span aria-hidden="true" className="ck-corner ck-corner--bl" />
      <span aria-hidden="true" className="ck-corner ck-corner--br" />
      {diamond && <span aria-hidden="true" className="ck-diamond" />}
      {diamondBottom && <span aria-hidden="true" className="ck-diamond ck-diamond--bottom" />}
    </section>
  );
}

/** Title bar for a Panel: Cinzel title on the left, controls/meta on the right. */
export function PanelHeader({
  title,
  count,
  children,
  shrinkTitle,
}: {
  title:        ReactNode;
  /** Rendered after the title in muted sans, e.g. "(26)". */
  count?:       ReactNode;
  children?:    ReactNode;
  /** Let a long title ellipsize instead of pushing the controls to wrap. */
  shrinkTitle?: boolean;
}) {
  return (
    <div className="ck-panel-header">
      <h2 className={`ck-panel-title${shrinkTitle ? " ck-panel-title--shrink" : ""}`} title={typeof title === "string" ? title : undefined}>
        {title}
        {count !== undefined && <span className="ck-panel-title__count">{count}</span>}
      </h2>
      {children && <div className="ck-panel-meta">{children}</div>}
    </div>
  );
}
