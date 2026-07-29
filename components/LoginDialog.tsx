"use client";

// components/LoginDialog.tsx
//
// Shared consistencykings.com login — username + 4-digit PIN, same account
// works on Stonks too (see lib/auth.ts). An unknown username claims the
// account with whatever PIN is entered; there's no separate signup flow.

import { useState } from "react";

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#222",
          padding: "24px",
          borderRadius: "10px",
          width: "360px",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "6px", fontSize: "20px" }}>Log In</h2>
        <p style={{ marginTop: 0, marginBottom: "16px", fontSize: "12px", color: "#999" }}>
          Same account as Stonks. An unknown username creates a new account.
        </p>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            Username
          </label>
          <input
            className="ck-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            4-Digit PIN
          </label>
          <input
            className="ck-input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#2f2f2f",
              color: "#f3f4f6",
              border: "1px solid #555",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Logging in..." : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
