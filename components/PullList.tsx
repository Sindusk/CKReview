"use client";

import type { Pull } from "@/types/Pull";
import { getPullRaidCutoff } from "@/lib/report-data";
import { SeverityIcon, SEVERITY_COLOR } from "./SeverityIcon";
import { PanelHeader } from "./ui/Panel";

type PullListProps = {
  pulls:          Pull[];
  selectedPullId: number | null;
  onSelectPull:   (id: number) => void;
};

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildLogUrl(pull: Pull): string {
  const base = pull.logSource === "ffl"
    ? "https://www.fflogs.com/reports"
    : "https://www.warcraftlogs.com/reports";
  return `${base}/${pull.reportCode}?fight=${pull.fightId}`;
}

export default function PullList({ pulls, selectedPullId, onSelectPull }: PullListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflow: "hidden" }}>
      <PanelHeader title="Pulls" count={pulls.length > 0 ? `(${pulls.length})` : undefined} />

      {pulls.length === 0 && (
        <div style={{ color: "var(--ck-text-3)", fontSize: "12px", padding: "10px 12px" }}>
          No pull data yet
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", flex: 1, padding: "8px 6px 8px 8px" }}>
        {pulls.map(pull => {
          const active = pull.id === selectedPullId;
          const isKill = pull.result === "Kill";
          const deaths = pull.deathEvents.length;
          const raids = pull.errors.filter(e => e.severity === "Raid");
          // #4 — Major/Minor errors after the raid was already wiping aren't
          // real analysis-worthy mistakes, so they're excluded from these
          // counts — same cutoff the Report's per-player stats use (see
          // getPullRaidCutoff / getPullCriticalEvents in report-data.ts).
          const cutoff = getPullRaidCutoff(pull);
          const majors = pull.errors.filter(e => e.severity === "Major" && (cutoff === null || e.timestamp <= cutoff));
          const minors = pull.errors.filter(e => e.severity === "Minor" && (cutoff === null || e.timestamp <= cutoff));

          const firstRaidTime = raids.length > 0 ? Math.min(...raids.map(e => e.timestamp)) : null;
          const resultBadgeText = isKill
            ? "KILL"
            : `WIPE${firstRaidTime !== null ? ` (${formatDuration(firstRaidTime)})` : ""}`;
          // Kill green / raid-called purple / plain-wipe red. The badge's
          // border and fill derive from this colour (.ck-badge).
          const resultBadgeColor = isKill
            ? "#4ade80"
            : firstRaidTime !== null
              ? "#c084fc"
              : "#f87171";

          return (
            <div
              key={pull.id}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onSelectPull(pull.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectPull(pull.id)}
              className={`ck-card ck-card--interactive${active ? " ck-card--selected" : ""}`}
              style={{
                textAlign: "left",
                padding: "7px 10px 8px",
                color: "var(--ck-text)",
                flexShrink: 0,
              }}
            >
              {/* Line 1 — name on the left, kill/wipe badge centered, log link on the right */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: "5px", gap: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", justifySelf: "start", maxWidth: "100%" }}>
                  <span className="ck-num" style={{ color: active ? "var(--ck-arcane-text)" : "var(--ck-text-gold)", marginRight: "5px" }}>
                    #{pull.pullNumber}
                  </span>
                  {pull.name}
                </span>

                <span className="ck-badge ck-num" style={{ color: resultBadgeColor, justifySelf: "center" }}>
                  {resultBadgeText}
                </span>

                {/* #3 — link to the source report, scoped to this fight */}
                <a
                  href={buildLogUrl(pull)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={`Open in ${pull.logSource === "ffl" ? "FFLogs" : "WarcraftLogs"}`}
                  className="ck-btn ck-btn--arcane ck-btn--xs"
                  style={{ justifySelf: "end" }}
                >
                  Log ↗
                </a>
              </div>

              {/* Line 2 — pull stats */}
              <div className="ck-num" style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11px", fontWeight: 500, color: "var(--ck-text-3)", minWidth: 0 }}>
                <span style={{ color: "var(--ck-text-2)" }}>⏱ {formatDuration(pull.fightDuration)}</span>
                {deaths > 0 ? (
                  <span style={{ color: SEVERITY_COLOR.Death, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <SeverityIcon kind="Death" size={12} /> {deaths} death{deaths !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span style={{ color: "#22c55e" }}>✓ No deaths</span>
                )}
                {majors.length > 0 && (
                  <span style={{ color: SEVERITY_COLOR.Major, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <SeverityIcon kind="Major" size={12} /> {majors.length} major
                  </span>
                )}
                {minors.length > 0 && (
                  <span style={{ color: SEVERITY_COLOR.Minor, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <SeverityIcon kind="Minor" size={12} /> {minors.length} minor
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
