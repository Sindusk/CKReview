"use client";

// components/ManageStaticsDialog.tsx
//
// Create/delete the current user's statics. Membership management beyond
// "you're the owner of what you created" is deferred — the CRUD routes for
// adding/removing members already exist (app/api/statics/[staticId]/members)
// but this dialog doesn't expose them yet.

import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type StaticSummary = {
  id:        number;
  name:      string;
  createdAt: string;
  role:      "OWNER" | "MEMBER";
};

type ManageStaticsDialogProps = {
  open:    boolean;
  onClose: () => void;
};

export default function ManageStaticsDialog({ open, onClose }: ManageStaticsDialogProps) {
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
          width: "440px",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>Manage Statics</h2>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            className="ck-input"
            style={{ flex: 1 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="New static name"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: creating ? "default" : "pointer",
              opacity: creating ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            Create
          </button>
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</p>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {statics === null ? (
            <p style={{ fontSize: "13px", color: "#999" }}>Loading...</p>
          ) : statics.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#999" }}>No statics yet.</p>
          ) : (
            statics.map(s => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  marginBottom: "4px",
                  backgroundColor: "#1a1a1a",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px" }}>{s.name}</div>
                  <div style={{ fontSize: "11px", color: "#777" }}>{s.role}</div>
                </div>
                {s.role === "OWNER" && (
                  <button
                    onClick={() => setPendingDeleteId(s.id)}
                    style={{
                      backgroundColor: "transparent",
                      color: "#f87171",
                      border: "1px solid #5c2626",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
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
            Close
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="Delete this static?"
        message={deleteTarget ? `"${deleteTarget.name}" and all of its linked reviews will be permanently removed.` : undefined}
        confirmLabel="Delete"
        onConfirm={() => pendingDeleteId != null && handleDelete(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
