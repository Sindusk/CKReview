"use client";

// components/LoginDialog.tsx
//
// Shared consistencykings.com login — the same account works on Stonks too
// (see lib/auth.ts). Two ways in:
//   - Google (lib/google-auth.ts), when configured. An unknown Google
//     account creates a new account, so the dialog tells PIN users to log
//     in with the PIN and link Google from Account → Sign-in methods.
//   - Username + 4-digit PIN, with Log In and Create Account as separate
//     modes (an unknown username no longer creates an account).
// `notice` shows the outcome of a Google round trip (AUTH_MESSAGES).

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";

/**
 * Messages for the `?auth=<code>` a Google round trip returns with (see
 * app/api/auth/google/callback/route.ts). A null message means success
 * that needs no note.
 */
export const AUTH_MESSAGES: Record<string, { text: string; error: boolean } | null> = {
  "google-signed-in":    null,
  "google-linked":       { error: false, text: "Google account linked. You can now sign in with Google on every consistencykings.com app." },
  "google-created":      { error: false, text: "Signed in with Google as a new account. If you already had a PIN account, log out, log in with your PIN, and link Google from Account → Sign-in methods instead." },
  "google-cancelled":    { error: true,  text: "Google sign-in was cancelled." },
  "google-expired":      { error: true,  text: "Google sign-in expired or was started in another tab. Try again." },
  "google-error":        { error: true,  text: "Google sign-in failed. Try again." },
  "google-unverified":   { error: true,  text: "That Google account's email address isn't verified." },
  "google-in-use":       { error: true,  text: "That Google account is already linked to a different account." },
  "google-other-linked": { error: true,  text: "This account already has a different Google account linked. Unlink it first." },
};

/** Where a Google button sends the browser: back to this page afterwards. */
export function googleStartUrl(): string {
  const back = new URL(window.location.href);
  back.searchParams.delete("auth");
  return `/api/auth/google?return_to=${encodeURIComponent(back.toString())}`;
}

type LoginDialogProps = {
  open:          boolean;
  onClose:       () => void;
  onLoggedIn:    (user: { username: string; role: string }) => void;
  googleEnabled: boolean;
  notice?:       { text: string; error: boolean } | null;
};

export default function LoginDialog({ open, onClose, onLoggedIn, googleEnabled, notice }: LoginDialogProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const signup = mode === "signup";

  async function handleSubmit() {
    if (!username.trim() || !/^\d{4}$/.test(pin)) {
      setError("Enter a username and a 4-digit PIN");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (signup ? "Sign-up failed" : "Login failed"));
        return;
      }

      onLoggedIn({ username: data.username, role: data.role });
      setUsername("");
      setPin("");
      onClose();
    } catch {
      setError("Request failed — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title={signup ? "Create Account" : "Log In"}
      subtitle="One account for every consistencykings.com app, including Stonks."
      width="380px"
      onBackdropClick={onClose}
      footer={
        <>
          <button
            className="ck-btn ck-btn--md"
            style={{ marginRight: "auto" }}
            onClick={() => { setMode(signup ? "login" : "signup"); setError(null); }}
          >
            {signup ? "Have an account? Log in" : "New? Create account"}
          </button>
          <button className="ck-btn ck-btn--md" onClick={onClose}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Working..." : signup ? "Create" : "Log In"}
          </button>
        </>
      }
    >
      {notice && (
        <p className={notice.error ? "ck-error-text" : "ck-dialog-text"} style={{ marginTop: 0 }}>
          {notice.text}
        </p>
      )}

      {googleEnabled && !signup && (
        <div style={{ marginBottom: "14px" }}>
          <a
            className="ck-btn ck-btn--md ck-btn--primary"
            href={googleStartUrl()}
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            Sign in with Google
          </a>
          <p className="ck-dialog-text" style={{ fontSize: "12px", marginBottom: 0 }}>
            Already use a PIN? Log in with it below, then link Google from
            Account → Sign-in methods so you keep your statics.
          </p>
        </div>
      )}

      <Field label="Username">
        <input
          className="ck-input"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
      </Field>

      <Field label="4-Digit PIN" style={{ marginBottom: error ? "10px" : 0 }}>
        <input
          className="ck-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
      </Field>

      {error && <p className="ck-error-text" style={{ marginBottom: 0 }}>{error}</p>}
    </Dialog>
  );
}
