"use client";

// components/StaticPlayersPanel.tsx
//
// Manages canonical player identities for a static (StaticPlayerIdentity) —
// merging two names together when someone's in-game name changes across
// reports (e.g. "Salty Dango" -> "Kup'o Noodles"), and renaming the
// canonical display name afterward. See lib/static-player-identity.ts for
// how names get auto-resolved to an identity at import time; this panel is
// the only place that identity graph gets edited by hand.

import { useEffect, useState, type CSSProperties } from "react";

type PlayerIdentity = {
  id:      number;
  name:    string;
  aliases: string[];
};

export default function StaticPlayersPanel({ staticId }: { staticId: number }) {
  const [players, setPlayers] = useState<PlayerIdentity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergeFrom, setMergeFrom] = useState<number | null>(null);
  const [mergeInto, setMergeInto] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    fetch(`/api/statics/${staticId}/players`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to load players"); return; }
        setPlayers(data.players);
      })
      .catch(() => setError("Failed to load players"));
  }

  useEffect(() => {
    if (Number.isInteger(staticId)) reload();
  }, [staticId]);

  async function handleMerge() {
    if (mergeFrom == null || mergeInto == null || mergeFrom === mergeInto) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/statics/${staticId}/players/merge`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fromIdentityId: mergeFrom, intoIdentityId: mergeInto }),
      });
      if (res.ok) {
        setMergeFrom(null);
        setMergeInto(null);
        reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to merge players");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(id: number) {
    const name = renameDraft.trim();
    if (!name) return;
    setBusy(true);
    try {
      await fetch(`/api/statics/${staticId}/players/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      setRenamingId(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (players == null) {
    return <p style={{ fontSize: "13px", color: "#999" }}>{error ?? "Loading players..."}</p>;
  }

  return (
    <div>
      {error && <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</p>}

      {players.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#999" }}>No players seen yet — import a review first.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "8px 10px",
                borderRadius:    "6px",
                backgroundColor: "#1a1a1a",
                gap:             "10px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                {renamingId === p.id ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      className="ck-input"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      style={{ fontSize: "13px" }}
                      autoFocus
                    />
                    <button onClick={() => handleRename(p.id)} disabled={busy} style={btnStyle("#2563eb", "#fff")}>Save</button>
                    <button onClick={() => setRenamingId(null)} style={btnStyle("transparent", "#aaa")}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: "13px" }}>{p.name}</span>
                    {p.aliases.length > 1 && (
                      <span style={{ fontSize: "11px", color: "#777", marginLeft: "8px" }}>
                        also: {p.aliases.filter((a) => a !== p.name).join(", ")}
                      </span>
                    )}
                  </>
                )}
              </div>
              {renamingId !== p.id && (
                <button
                  onClick={() => { setRenamingId(p.id); setRenameDraft(p.name); }}
                  style={btnStyle("transparent", "#aaa")}
                >
                  Rename
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {players.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "#999" }}>Merge</span>
          <select className="ck-input" value={mergeFrom ?? ""} onChange={(e) => setMergeFrom(Number(e.target.value) || null)} style={{ fontSize: "12px" }}>
            <option value="">Select player…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span style={{ fontSize: "12px", color: "#999" }}>into</span>
          <select className="ck-input" value={mergeInto ?? ""} onChange={(e) => setMergeInto(Number(e.target.value) || null)} style={{ fontSize: "12px" }}>
            <option value="">Select player…</option>
            {players.filter((p) => p.id !== mergeFrom).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={handleMerge}
            disabled={busy || mergeFrom == null || mergeInto == null}
            style={btnStyle("#2563eb", "#fff")}
          >
            Merge
          </button>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string, color: string): CSSProperties {
  return {
    backgroundColor: bg,
    color,
    border:          bg === "transparent" ? "1px solid #444" : "none",
    borderRadius:    "5px",
    padding:         "5px 10px",
    fontSize:        "12px",
    fontWeight:      600,
    cursor:          "pointer",
  };
}
