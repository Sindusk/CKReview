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
      {/* The collapse toggle doubles as the enclosing Panel's title bar. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ck-panel-header"
        style={{
          width:          "100%",
          justifyContent: "flex-start",
          cursor:         "pointer",
          fontFamily:     "inherit",
          color:          "inherit",
          textAlign:      "left",
          borderTop:      0,
          borderLeft:     0,
          borderRight:    0,
          ...(open ? {} : { borderBottomColor: "transparent" }),
        }}
      >
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.1s", display: "inline-block", fontSize: "10px", color: "var(--ck-text-gold)" }}>
          &#9654;
        </span>
        <span className="ck-panel-title">
          Players
          {players && <span className="ck-panel-title__count">({players.length})</span>}
        </span>
      </button>

      {open && (
        <div style={{ padding: "14px 16px 16px" }}>
          {error && <p className="ck-error-text">{error}</p>}

          {sortedPlayers == null ? (
            <p className="ck-dialog-text">Loading players...</p>
          ) : sortedPlayers.length === 0 ? (
            <p className="ck-dialog-text">No players seen yet — import a review first.</p>
          ) : (
            <div className="ck-table-wrap" style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table className="ck-table" style={{ fontSize: "12px" }}>
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
                      <tr key={p.id}>
                        <td style={{ padding: "6px 8px" }}>
                          {renamingId === p.id ? (
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input
                                className="ck-field"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                                autoFocus
                              />
                              <button className="ck-btn ck-btn--sm ck-btn--primary" onClick={() => handleRename(p.id)} disabled={busy}>Save</button>
                              <button className="ck-btn ck-btn--sm" onClick={() => setRenamingId(null)}>Cancel</button>
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
                                <span style={{ fontSize: "11px", color: "var(--ck-text-3)" }}>
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
                            <button className="ck-btn ck-btn--xs" onClick={() => { setRenamingId(p.id); setRenameDraft(p.name); }}>
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
              <span className="ck-label" style={{ margin: 0 }}>Merge</span>
              <select className="ck-field" value={mergeFrom ?? ""} onChange={(e) => setMergeFrom(Number(e.target.value) || null)} style={{ padding: "4px 8px" }}>
                <option value="">Select player…</option>
                {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="ck-label" style={{ margin: 0 }}>into</span>
              <select className="ck-field" value={mergeInto ?? ""} onChange={(e) => setMergeInto(Number(e.target.value) || null)} style={{ padding: "4px 8px" }}>
                <option value="">Select player…</option>
                {players.filter((p) => p.id !== mergeFrom).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                className="ck-btn ck-btn--sm ck-btn--primary"
                onClick={handleMerge}
                disabled={busy || mergeFrom == null || mergeInto == null}
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
    <th style={{ ...thStyle(align), cursor: "pointer", userSelect: "none", color: active ? "#f4dca0" : undefined }}>
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
        <span style={{ width: "8px", fontSize: "9px", color: active ? "#f4dca0" : "transparent" }}>
          {sortAsc ? "▲" : "▼"}
        </span>
      </span>
    </th>
  );
}

// Colours, borders and header styling come from .ck-table (app/theme.css).
function thStyle(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "7px 8px" };
}

function tdStyle(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "6px 8px" };
}
