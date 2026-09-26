"use client";

import { Dialog } from "./ui/Dialog";

type SessionFoundDialogProps = {
  open:           boolean;
  vodCount:       number;
  wipeCount:      number;
  onLoad:         () => void;
  onImportFresh:  () => void;
};

export default function SessionFoundDialog({
  open,
  vodCount,
  wipeCount,
  onLoad,
  onImportFresh,
}: SessionFoundDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      title="Session Found"
      width="460px"
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onImportFresh}>Import Fresh</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={onLoad}>Load Session</button>
        </>
      }
    >
      <p className="ck-dialog-text">
        A saved session already exists for this log
        {vodCount > 0 && <> with {vodCount} VOD{vodCount === 1 ? "" : "s"}</>}
        {wipeCount > 0 && <> and {wipeCount} wipe call{wipeCount === 1 ? "" : "s"}</>}.
        Would you like to load it instead of starting a new one?
      </p>
    </Dialog>
  );
}