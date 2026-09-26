"use client";

// components/ConfirmDialog.tsx
//
// Small reusable yes/no confirmation modal. Used by AnalysisPanel for both
// "Remove Wipe Call?" and "Remove this error?" — anywhere a destructive
// action needs one extra step before it actually happens.

import { Dialog } from "./ui/Dialog";

type ConfirmDialogProps = {
  open:          boolean;
  title:         string;
  message?:      string;
  confirmLabel?: string;
  cancelLabel?:  string;
  onConfirm:     () => void;
  onCancel:      () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel  = "No",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      title={title}
      width="380px"
      zIndex={1100}
      onBackdropClick={onCancel}
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onCancel}>{cancelLabel}</button>
          <button className="ck-btn ck-btn--md ck-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      {message && <p className="ck-dialog-text">{message}</p>}
    </Dialog>
  );
}