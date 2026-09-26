"use client";

// components/ManageStaticsDialog.tsx
//
// Create/delete the current user's statics. Membership management beyond
// "you're the owner of what you created" is deferred — the CRUD routes for
// adding/removing members already exist (app/api/statics/[staticId]/members)
// but this dialog doesn't expose them yet.

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "./ConfirmDialog";
import { Dialog } from "./ui/Dialog";

type StaticSummary = {
  id:        number;
  name:      string;
  createdAt: string;
  role:      "OWNER" | "MEMBER";
};

type ManageStaticsDialogProps = {
  open:      boolean;
  // Current report session, if any — carried into the static dashboard's
  // URL so its "Back" link can round-trip it (see app/statics/[staticId]/
  // page.tsx), restoring the report instead of landing on a blank page.
  sessionId: string | null;
  onClose:   () => void;
};

export default function ManageStaticsDialog({ open, sessionId, onClose }: ManageStaticsDialogProps) {
  const [statics, setStatics] = useState<StaticSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  function reload() {
    fetch("/api/statics")
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load your statics");
          setStatics([]);
          return;
        }
        setError(null);
        setStatics(data.statics);
      })
      .catch(() => setError("Failed to load your statics"));
  }

  useEffect(() => {
    if (open) reload();
  }, [open]);

  if (!open) return null;

  async function handleCreate() {
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/statics", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create static");
        return;
      }

      setNewName("");
      reload();
    } catch {
      setError("Failed to create static — check your connection and try again");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    setPendingDeleteId(null);
    const res = await fetch(`/api/statics/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to delete static");
      return;
    }
    reload();
  }

  const deleteTarget = statics?.find(s => s.id === pendingDeleteId) ?? null;

  return (
    <>
      <Dialog
        title="Manage Statics"
        width="460px"
        maxHeight="70vh"
        onBackdropClick={onClose}
        footer={<button className="ck-btn ck-btn--md" onClick={onClose}>Close</button>}
        bodyStyle={{ display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexShrink: 0 }}>
          <input
            className="ck-input"
            style={{ flex: 1 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="New static name"
          />
          <button
            className="ck-btn ck-btn--md ck-btn--primary"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            Create
          </button>
        </div>

        {error && <p className="ck-error-text">{error}</p>}

        <div className="ck-section-label" style={{ marginTop: 0 }}>Your statics</div>

        {statics === null ? (
          <p className="ck-dialog-text">Loading...</p>
        ) : statics.length === 0 ? (
          <p className="ck-dialog-text">No statics yet.</p>
        ) : (
          statics.map(s => (
            <div
              key={s.id}
              className="ck-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "8px 10px",
                marginBottom: "5px",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: s.role === "OWNER" ? "var(--ck-text-gold)" : "var(--ck-text-3)" }}>
                  {s.role}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <Link
                  href={sessionId ? `/statics/${s.id}?session=${sessionId}` : `/statics/${s.id}`}
                  onClick={onClose}
                  className="ck-btn ck-btn--sm ck-btn--arcane"
                >
                  View
                </Link>
                {s.role === "OWNER" && (
                  <button className="ck-btn ck-btn--sm ck-btn--danger" onClick={() => setPendingDeleteId(s.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="Delete this static?"
        message={deleteTarget ? `"${deleteTarget.name}" and all of its linked reviews will be permanently removed.` : undefined}
        confirmLabel="Delete"
        onConfirm={() => pendingDeleteId != null && handleDelete(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
