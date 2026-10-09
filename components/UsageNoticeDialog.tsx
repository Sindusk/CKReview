"use client";

// components/UsageNoticeDialog.tsx
//
// One-time constructive-use notice, shown on the first import attempt in a
// browser (before the session check or any fetch). "Got It" stores a flag
// in localStorage so it never shows again in that browser. If storage is
// unavailable (private window, blocked site data) the notice simply shows
// again next time.

import { Dialog } from "./ui/Dialog";

const ACCEPTED_KEY = "ck_usage_notice_accepted";

export function hasAcceptedUsageNotice(): boolean {
  try {
    return localStorage.getItem(ACCEPTED_KEY) === "1";
  } catch {
    return false;
  }
}

function storeAcceptance(): void {
  try {
    localStorage.setItem(ACCEPTED_KEY, "1");
  } catch {
    // Not persisted; the notice shows again next import.
  }
}

type Props = {
  open:     boolean;
  onAccept: () => void;
};

export default function UsageNoticeDialog({ open, onAccept }: Props) {
  if (!open) return null;

  function handleAccept() {
    storeAcceptance();
    onAccept();
  }

  return (
    <Dialog
      title="Before You Import"
      width="440px"
      footer={
        <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleAccept} autoFocus>
          Got It
        </button>
      }
    >
      <p style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: 1.55 }}>
        Raid Review is built for raid leads and statics reviewing pulls together: finding where the
        group can improve, and bringing that back to the team.
      </p>
      <p style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: 1.55 }}>
        Findings are log-inferred and can be incorrect. Check the VOD before acting on them.
      </p>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.55 }}>
        Please do not use the information provided to harass or insult other players.
      </p>
    </Dialog>
  );
}
