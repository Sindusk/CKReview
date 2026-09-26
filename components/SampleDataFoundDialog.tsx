"use client";

import { Dialog } from "./ui/Dialog";

type SampleDataFoundDialogProps = {
  open:          boolean;
  reportCode:    string;
  fightCount:    number;
  onUseSample:   () => void;
  onFetchLive:   () => void;
};

export default function SampleDataFoundDialog({
  open,
  reportCode,
  fightCount,
  onUseSample,
  onFetchLive,
}: SampleDataFoundDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      title="Local Sample Data Found"
      width="460px"
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onFetchLive}>Fetch Live Instead</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={onUseSample}>Load From Sample Data</button>
        </>
      }
    >
      <p className="ck-dialog-text">
        Report <strong>{reportCode}</strong> was already fetched to disk ({fightCount} fight{fightCount === 1 ? "" : "s"}).
        Load it from local sample data instead of the live API? This won&apos;t spend any rate-limit points.
      </p>
    </Dialog>
  );
}
