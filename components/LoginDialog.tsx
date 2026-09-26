"use client";

// components/LoginDialog.tsx
//
// Shared consistencykings.com login — username + 4-digit PIN, same account
// works on Stonks too (see lib/auth.ts). An unknown username claims the
// account with whatever PIN is entered; there's no separate signup flow.

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";

type LoginDialogProps = {
  open:       boolean;
  onClose:    () => void;
  onLoggedIn: (user: { username: string; role: string }) => void;
};

export default function LoginDialog({ open, onClose, onLoggedIn }: LoginDialogProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!username.trim() || !/^\d{4}$/.test(pin)) {
      setError("Enter a username and a 4-digit PIN");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      onLoggedIn({ username: data.username, role: data.role });
      setUsername("");
      setPin("");
      onClose();
    } catch {
      setError("Login failed — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      title="Log In"
      subtitle="Same account as Stonks. An unknown username creates a new account."
      width="380px"
      onBackdropClick={onClose}
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onClose}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Logging in..." : "Log In"}
          </button>
        </>
      }
    >
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
