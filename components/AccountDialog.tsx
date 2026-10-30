"use client";

// components/AccountDialog.tsx
//
// Account → Sign-in methods: link or unlink Google, and turn the PIN off
// (only with Google linked) or set one (only while there is none). Linking
// keeps the account — and so its statics and Stonks portfolio — and just
// adds Google as a way in. Reads /api/auth/me itself each time it opens.

import { useCallback, useEffect, useState } from "react";
import { Dialog, Field } from "./ui/Dialog";
import { googleStartUrl } from "./LoginDialog";

type Account = {
  username:    string;
  role:        string;
  hasPin:      boolean;
  googleEmail: string | null;
};

type AccountDialogProps = {
  open:    boolean;
  onClose: () => void;
  notice?: { text: string; error: boolean } | null;
};

export default function AccountDialog({ open, onClose, notice }: AccountDialogProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await fetch("/api/auth/me").then(res => res.json()).catch(() => null);
    setAccount(data?.user ?? null);
    setGoogleEnabled(Boolean(data?.googleEnabled));
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      refresh();
    }
  }, [open, refresh]);

  if (!open) return null;

  async function post(url: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Request failed");
      await refresh();
      return res.ok;
    } catch {
      setError("Request failed — check your connection and try again");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function disablePin() {
    if (!window.confirm("Turn your PIN off? You'll sign in with Google on every consistencykings.com app, including Stonks.")) return;
    post("/api/auth/pin", { action: "disable" });
  }

  async function setPin() {
    if (!/^\d{4}$/.test(newPin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (await post("/api/auth/pin", { action: "set", pin: newPin })) setNewPin("");
  }

  const rowStyle = { display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" } as const;

  return (
    <Dialog
      title="Sign-in Methods"
      subtitle={account ? `Account: ${account.username}` : undefined}
      width="420px"
      onBackdropClick={onClose}
      footer={<button className="ck-btn ck-btn--md" onClick={onClose}>Close</button>}
    >
      {notice && (
        <p className={notice.error ? "ck-error-text" : "ck-dialog-text"} style={{ marginTop: 0 }}>
          {notice.text}
        </p>
      )}

      {!account ? (
        <p className="ck-dialog-text">Not logged in.</p>
      ) : (
        <>
          <Field label="Google">
            <div style={rowStyle}>
              <span className="ck-dialog-text">{account.googleEmail ?? "Not linked"}</span>
              {account.googleEmail == null ? (
                googleEnabled && (
                  <a className="ck-btn ck-btn--sm ck-btn--primary" href={googleStartUrl()} style={{ textDecoration: "none" }}>
                    Link Google
                  </a>
                )
              ) : (
                account.hasPin && (
                  <button className="ck-btn ck-btn--sm" disabled={busy} onClick={() => post("/api/auth/google/unlink")}>
                    Unlink
                  </button>
                )
              )}
            </div>
          </Field>

          <Field label="4-Digit PIN" style={{ marginBottom: error ? "10px" : 0 }}>
            {account.hasPin ? (
              <div style={rowStyle}>
                <span className="ck-dialog-text">On</span>
                {account.googleEmail != null && (
                  <button className="ck-btn ck-btn--sm ck-btn--danger" disabled={busy} onClick={disablePin}>
                    Turn PIN off
                  </button>
                )}
              </div>
            ) : (
              <div style={rowStyle}>
                <input
                  className="ck-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Off — enter 4 digits to set one"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={e => e.key === "Enter" && setPin()}
                />
                <button className="ck-btn ck-btn--sm" disabled={busy} onClick={setPin}>Set PIN</button>
              </div>
            )}
          </Field>

          {error && <p className="ck-error-text" style={{ marginBottom: 0 }}>{error}</p>}
        </>
      )}
    </Dialog>
  );
}
