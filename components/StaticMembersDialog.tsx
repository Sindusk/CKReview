"use client";

// components/StaticMembersDialog.tsx
//
// A static's members, opened from the static dashboard's Members button.
// Everyone sees the list (username + role). The owner adds an existing
// account by username as Member or Moderator, switches a member between
// the two, and removes members; anyone else gets a Leave button. Roles
// and what each may do: lib/static-access.ts. Routes:
// app/api/statics/[staticId]/members (GET/POST) and members/[userId]
// (PATCH/DELETE).

import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { Dialog } from "./ui/Dialog";

export type StaticRole = "OWNER" | "MODERATOR" | "MEMBER";

export const ROLE_LABEL: Record<StaticRole, string> = { OWNER: "Owner", MODERATOR: "Moderator", MEMBER: "Member" };
export const ROLE_COLOR: Record<StaticRole, string> = {
  OWNER:     "var(--ck-text-gold)",
  MODERATOR: "var(--ck-text)",
  MEMBER:    "var(--ck-text-2)",
};

type Member = { userId: number; username: string; role: StaticRole; addedAt: string };

export default function StaticMembersDialog({ open, staticId, viewerUserId, viewerRole, onClose, onLeft }: {
  open:         boolean;
  staticId:     number;
  viewerUserId: number;
  viewerRole:   StaticRole;
  onClose:      () => void;
  // After the viewer leaves: the page is no longer theirs to show.
  onLeft:       () => void;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [newRole, setNewRole] = useState<"MEMBER" | "MODERATOR">("MEMBER");
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  const isOwner = viewerRole === "OWNER";

  function reload() {
    fetch(`/api/statics/${staticId}/members`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to load members"); setMembers([]); return; }
        setMembers(data.members);
      })
      .catch(() => setError("Failed to load members"));
  }

  useEffect(() => {
    if (open) { setError(null); reload(); }
  }, [open, staticId]);

  if (!open) return null;

  async function call(url: string, init: RequestInit, fallback: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || fallback);
        return false;
      }
      return true;
    } catch {
      setError(`${fallback} — check your connection and try again`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    const name = username.trim();
    if (!name) return;
    const ok = await call(`/api/statics/${staticId}/members`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username: name, role: newRole }),
    }, "Failed to add member");
    if (ok) { setUsername(""); reload(); }
  }

  async function handleRoleChange(m: Member, role: "MEMBER" | "MODERATOR") {
    const ok = await call(`/api/statics/${staticId}/members/${m.userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role }),
    }, "Failed to change role");
    if (ok) setMembers((prev) => prev?.map((x) => (x.userId === m.userId ? { ...x, role } : x)) ?? null);
  }

  async function handleRemove(m: Member) {
    setPendingRemove(null);
    const ok = await call(`/api/statics/${staticId}/members/${m.userId}`, { method: "DELETE" }, "Failed to remove member");
    if (!ok) return;
    if (m.userId === viewerUserId) { onLeft(); return; }
    reload();
  }

  const leaving = pendingRemove?.userId === viewerUserId;

  return (
    <>
      <Dialog
        title="Members"
        width="480px"
        maxHeight="75vh"
        onBackdropClick={onClose}
        onClose={onClose}
        footer={
          <>
            {!isOwner && (
              <button
                className="ck-btn ck-btn--md ck-btn--danger"
                disabled={busy || !members}
                onClick={() => setPendingRemove(members?.find((m) => m.userId === viewerUserId) ?? null)}
              >
                Leave static
              </button>
            )}
            <button className="ck-btn ck-btn--md" onClick={onClose}>Close</button>
          </>
        }
      >
        {isOwner && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input
              className="ck-input"
              style={{ flex: 1, minWidth: 0 }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Username"
              aria-label="Username to add"
            />
            <select
              className="ck-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "MEMBER" | "MODERATOR")}
              aria-label="Role for the new member"
              style={{ width: "auto" }}
            >
              <option value="MEMBER">Member</option>
              <option value="MODERATOR">Moderator</option>
            </select>
            <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleAdd} disabled={busy || !username.trim()}>
              Add
            </button>
          </div>
        )}

        {error && <p className="ck-error-text">{error}</p>}

        <p className="ck-dialog-text" style={{ marginTop: 0 }}>
          Moderators can add and resync sessions, edit notes and labels, and merge or rename players. Members can view only.
        </p>

        {members === null ? (
          <p className="ck-dialog-text">Loading members...</p>
        ) : (
          <div className="ck-table-wrap">
            <table className="ck-table" style={{ fontSize: "13px", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>User</th>
                  <th style={{ textAlign: "left" }}>Role</th>
                  {isOwner && <th />}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td>
                      {m.username}
                      {m.userId === viewerUserId && <span style={{ color: "var(--ck-text-3)" }}> (you)</span>}
                    </td>
                    <td>
                      {isOwner && m.role !== "OWNER" ? (
                        <select
                          className="ck-select"
                          value={m.role}
                          disabled={busy}
                          onChange={(e) => handleRoleChange(m, e.target.value as "MEMBER" | "MODERATOR")}
                          aria-label={`Role for ${m.username}`}
                          style={{ width: "auto", height: "auto", fontSize: "12px", padding: "3px 6px" }}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MODERATOR">Moderator</option>
                        </select>
                      ) : (
                        <span className="ck-badge ck-badge--plain" style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
                      )}
                    </td>
                    {isOwner && (
                      <td style={{ textAlign: "right" }}>
                        {m.role !== "OWNER" && (
                          <button className="ck-btn ck-btn--xs ck-btn--danger" disabled={busy} onClick={() => setPendingRemove(m)}>
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={leaving ? "Leave this static?" : "Remove this member?"}
        message={
          pendingRemove
            ? leaving
              ? "You'll lose access to this static until the owner adds you again. Its sessions are not affected."
              : `${pendingRemove.username} will lose access to this static. Sessions they added stay.`
            : undefined
        }
        confirmLabel={leaving ? "Leave" : "Remove"}
        cancelLabel="Cancel"
        onConfirm={() => pendingRemove && handleRemove(pendingRemove)}
        onCancel={() => setPendingRemove(null)}
      />
    </>
  );
}
