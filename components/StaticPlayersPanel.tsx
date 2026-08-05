"use client";

// components/StaticPlayersPanel.tsx
//
// Manages canonical player identities for a static (StaticPlayerIdentity) —
// merging two names together when someone's in-game name changes across
// reports (e.g. "Salty Dango" -> "Kup'o Noodles"), and renaming the
// canonical display name afterward. See lib/static-player-identity.ts for
// how names get auto-resolved to an identity at import time; this panel is
// the only place that identity graph gets edited by hand.
//
// Collapsed by default — it's a management tool, not something glanced at
// every visit, and a full roster (soon including substitutes) takes up
// real space once opened.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getClassColor, getPlayerSpecIcon } from "@/lib/player-display";

type PlayerJob = { game: string; className: string; specId: number | null } | null;

type PlayerIdentity = {
  id:           number;
  name:         string;
  aliases:      string[];
  job:          PlayerJob;
  majorErrors:  number;
  minorErrors:  number;
  totalErrors:  number;
  pullsCount:   number;
  // Majors per pull as a 0–100+ percentage — Minors deliberately excluded,
  // see the /players route's header comment.
  errorRatePct: number;
};

// Every column the table can be ordered by. `name` sorts ascending by
// default (A→Z reads naturally); the numeric columns start descending,
// since "who has the most" is the question being asked of them.
type SortKey = "name" | "minorErrors" | "majorErrors" | "totalErrors" | "pullsCount" | "errorRatePct";

const NUMERIC_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "minorErrors",  label: "Minor Errors" },
  { key: "majorErrors",  label: "Major Errors" },
  { key: "totalErrors",  label: "Total Errors" },
  { key: "pullsCount",   label: "Pulls" },
  { key: "errorRatePct", label: "% Error Rate" },
];

export default function StaticPlayersPanel({ staticId }: { staticId: number }) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerIdentity[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("majorErrors");
  const [sortAsc, setSortAsc] = useState(false);
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
    if (open && players == null && Number.isInteger(staticId)) reload();
  }, [open, staticId]);

  // Ties fall back to name so the order is stable when several players
  // share a count (very common early in a static's life, when everyone is
  // still on 0).
  const sortedPlayers = useMemo(() => {
    if (!players) return null;
    const dir = sortAsc ? 1 : -1;
    return [...players].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const diff = (a[sortKey] - b[sortKey]) * dir;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [players, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

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

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display:        "flex",
          alignItems:      "center",
          gap:             "10px",
          width:           "100%",
          background:      "none",
          border:          "none",
          cursor:          "pointer",
          color:           "#eee",
          padding:         0,
          textAlign:       "left",
        }}
      >
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.1s", display: "inline-block", fontSize: "11px", color: "#888" }}>
          &#9654;
        </span>
        <strong style={{ fontSize: "14px" }}>Players</strong>
        {players && <span style={{ fontSize: "12px", color: "#666" }}>{players.length}</span>}
      </button>

      {open && (
        <div style={{ marginTop: "14px" }}>
          {error && <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</p>}

          {sortedPlayers == null ? (
            <p style={{ fontSize: "13px", color: "#999" }}>Loading players...</p>
          ) : sortedPlayers.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#999" }}>No players seen yet — import a review first.</p>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <SortableTh
                      label="Player"
                      align="left"
                      column="name"
                      sortKey={sortKey}
                      sortAsc={sortAsc}
                      onSort={toggleSort}
                    />
                    {NUMERIC_COLUMNS.map((col) => (
                      <SortableTh
                        key={col.key}
                        label={col.label}
                        align="right"
                        column={col.key}
                        sortKey={sortKey}
                        sortAsc={sortAsc}
                        onSort={toggleSort}
                      />
                    ))}
                    <th style={thStyle("left")}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p) => {
                    const color = p.job ? getClassColor(p.job.game as "wow" | "ffxiv", p.job.className) : "#aaa";
                    const icon = p.job ? getPlayerSpecIcon(p.job.game as "wow" | "ffxiv", p.job.specId ?? 0, p.job.className) : null;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #2a2a2a" }}>
                        <td style={{ padding: "6px 8px" }}>
                          {renamingId === p.id ? (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <input
                                className="ck-input"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                style={{ fontSize: "12px" }}
                                autoFocus
                              />
                              <button onClick={() => handleRename(p.id)} disabled={busy} style={btnStyle("#2563eb", "#fff")}>Save</button>
                              <button onClick={() => setRenamingId(null)} style={btnStyle("transparent", "#aaa")}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {icon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={icon} alt="" width={16} height={16} style={{ borderRadius: "2px", flexShrink: 0 }} />
                              ) : (
                                <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
                              )}
                              <span style={{ color }}>{p.name}</span>
                              {p.aliases.length > 1 && (
                                <span style={{ fontSize: "11px", color: "#777" }}>
                                  ({p.aliases.filter((a) => a !== p.name).join(", ")})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle("right")}>{p.minorErrors}</td>
                        <td style={tdStyle("right")}>{p.majorErrors}</td>
                        <td style={tdStyle("right")}>{p.totalErrors}</td>
                        <td style={tdStyle("right")}>{p.pullsCount}</td>
                        <td style={tdStyle("right")} title="Major errors per pull">{p.errorRatePct.toFixed(0)}%</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {renamingId !== p.id && (
                            <button onClick={() => { setRenamingId(p.id); setRenameDraft(p.name); }} style={btnStyle("transparent", "#aaa")}>
                              Rename
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {players && players.length > 1 && (
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
      )}
    </div>
  );
}

function SortableTh({
  label,
  align,
  column,
  sortKey,
  sortAsc,
  onSort,
}: {
  label:   string;
  align:   "left" | "right";
  column:  SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort:  (key: SortKey) => void;
}) {
  const active = sortKey === column;

  return (
    <th style={{ ...thStyle(align), cursor: "pointer", userSelect: "none", color: active ? "#e8e6dd" : "#898781" }}>
      <span
        onClick={() => onSort(column)}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            "4px",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
        }}
        title={`Sort by ${label}`}
      >
        {label}
        {/* Reserved-width caret so the header doesn't jump as sorting moves. */}
        <span style={{ width: "8px", fontSize: "9px", color: active ? "#e8e6dd" : "transparent" }}>
          {sortAsc ? "▲" : "▼"}
        </span>
      </span>
    </th>
  );
}

function thStyle(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "6px 8px", color: "#898781", borderBottom: "1px solid #2c2c2a", fontWeight: 600 };
}

function tdStyle(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "6px 8px", color: "#c3c2b7", fontVariantNumeric: "tabular-nums" };
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
