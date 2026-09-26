import type { CSSProperties, ReactNode } from "react";
import { Panel, PanelHeader } from "./Panel";

/*
  Modal shell shared by every dialog: dimmed backdrop, a gilt Panel frame,
  a Cinzel title bar and an optional footer row for the action buttons.
  Callers keep their own `if (!open) return null` and their own state; this
  only owns the chrome.

  Backdrop clicks close the dialog only when `onBackdropClick` is passed —
  form dialogs deliberately leave it out so a stray click can't discard
  what was typed.
*/
export function Dialog({
  title,
  subtitle,
  width,
  maxHeight = "90vh",
  zIndex = 1000,
  onBackdropClick,
  onClose,
  headerActions,
  footer,
  bodyStyle,
  children,
}: {
  title:            ReactNode;
  subtitle?:        ReactNode;
  /** Any CSS width; it is capped to the viewport. */
  width:            string;
  maxHeight?:       string;
  zIndex?:          number;
  onBackdropClick?: () => void;
  /** Renders a ✕ button in the title bar. */
  onClose?:         () => void;
  headerActions?:   ReactNode;
  footer?:          ReactNode;
  bodyStyle?:       CSSProperties;
  children?:        ReactNode;
}) {
  return (
    <div className="ck-overlay" style={{ zIndex }} onClick={onBackdropClick}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxWidth: "100%", maxHeight, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <Panel style={{ flex: "1 1 auto", minHeight: 0 }}>
          <PanelHeader title={title} subtitle={subtitle} shrinkTitle>
            {headerActions}
            {onClose && (
              <button className="ck-btn ck-btn--sm" onClick={onClose} aria-label="Close" title="Close">
                ✕
              </button>
            )}
          </PanelHeader>

          {children !== undefined && (
            <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "16px 18px", ...bodyStyle }}>
              {children}
            </div>
          )}

          {footer && <div className="ck-dialog-footer">{footer}</div>}
        </Panel>
      </div>
    </div>
  );
}

/** Uppercase field label + control, the standard dialog form row. */
export function Field({
  label,
  children,
  style,
}: {
  label:    ReactNode;
  children: ReactNode;
  style?:   CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "14px", ...style }}>
      <label className="ck-label">{label}</label>
      {children}
    </div>
  );
}
