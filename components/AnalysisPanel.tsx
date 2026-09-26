"use client";

import { useState } from "react";
import type { Pull } from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, ManualErrorInput } from "@/types/PullError";
import { CALL_WIPE_RULE_ID, MANUAL_ERROR_RULE_ID } from "@/types/PullError";
import { getClassColor, getRoleColor, formatClassName, getPlayerSpecIcon } from "@/lib/player-display";
import { getSpecInfo } from "@/lib/spec-data";
import ConfirmDialog from "./ConfirmDialog";
import AddErrorDialog from "./AddErrorDialog";
import { SeverityIcon, SEVERITY_COLOR, type SeverityKind } from "./SeverityIcon";
import { PanelHeader } from "./ui/Panel";

type AnalysisPanelProps = {
  pull: Pull | null;
  playbackTimeMs: number;
  onSeekToTime?: (ms: number) => void;
  // Fires when the user clicks "Call Wipe" — page.tsx appends a manual
  // Raid error (createCallWipeError) to this pull at the given timestamp.
  onCallWipe?: (pullId: number, timestampMs: number) => void;
  // Fires when the user submits the "Add Error" dialog — page.tsx appends
  // a manual error (createManualError) to this pull.
  onAddError?: (pullId: number, input: ManualErrorInput) => void;
  // Fires when the user confirms removal of a Call Wipe marker OR a
  // manually-added error, identified by PullError.id.
  onRemoveError?: (pullId: number, errorId: string) => void;
  // Whether playbackTimeMs actually reflects a calibrated VOD right now —
  // used to decide whether to prefill the Add Error dialog's timestamp.
  vodTimeAvailable?: boolean;
};

// "Review" is the default tab — the curated raid-review feed showing only
// what's worth talking through after a pull: Raid + Major errors, no
// deaths (mostly consequences) and no Minor noise.
type Tab = "Overall" | "Deaths" | "Review" | "Raid" | "Major" | "Minor";

// Unified shape for anything that can appear in the timeline feed —
// a death, or a Raid/Major/Minor error.
type FeedKind = "Death" | "Raid" | "Major" | "Minor";

// FeedEntry needs the game so FeedRow can pick the right color table.
// player/class/role are optional — Raid errors are raid-wide mistakes not
// attributable to any one person (see types/PullError.ts).
type FeedEntry = {
  kind:      FeedKind;
  timestamp: number;
  player?:   string;
  class?:    string;
  specId?:   number;
  role?:     "Tank" | "Healer" | "DPS";
  title:     string;
  titleIcon?: string;
  abilityId?: number;
  subtitle?: string;
  game:      "wow" | "ffxiv";
  // Only present on PullError-derived entries (not deaths) — lets FeedRow
  // decide whether this specific entry can be deleted (manually-added
  // errors only; auto-detected rule errors have no `id`).
  id?:       string;
  ruleId?:   string;
};

function deathToFeedEntry(d: DeathEvent, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: "Death", timestamp: d.timestamp, player: d.player, class: d.class, specId: d.specId, role: d.role, title: d.cause, titleIcon: d.causeIcon, abilityId: d.killingAbilityGameId, game };
}

function errorToFeedEntry(e: PullError, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: e.severity, timestamp: e.timestamp, player: e.player, class: e.class, specId: e.specId, role: e.role, title: e.name, titleIcon: e.abilityIcon, abilityId: e.abilityId, subtitle: e.description, game, id: e.id, ruleId: e.ruleId };
}

const FEED_KIND_STYLE: Record<FeedKind, { color: string; label: string }> = {
  Death: { color: SEVERITY_COLOR.Death, label: "Death" },
  Raid:  { color: SEVERITY_COLOR.Raid,  label: "Raid" },
  Major: { color: SEVERITY_COLOR.Major, label: "Major" },
  Minor: { color: SEVERITY_COLOR.Minor, label: "Minor" },
};

function formatMs(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

// MM:SS — the format players actually use for pull timers, not "Xm XXs".
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCallTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSpecLabel(game: "wow" | "ffxiv", specId: number | undefined, className: string): string {
  if (game === "wow") return getSpecInfo(specId ?? 0).name;
  return formatClassName(className);
}

function TitleIcon({ src, abilityId, game }: { src?: string; abilityId?: number; game: "wow" | "ffxiv" }) {
  if (!src) return null;

  const img = (
    <img
      src={src}
      alt=""
      width={14}
      height={14}
      style={{ borderRadius: "2px", flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );

  if (game === "wow" && abilityId) {
    return (
      <a
        href={`https://www.wowhead.com/spell=${abilityId}`}
        className="wowhead"
        onClick={(e) => e.preventDefault()}
        style={{ display: "inline-flex", flexShrink: 0 }}
      >
        {img}
      </a>
    );
  }

  return img;
}

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="ck-section-label">
      <span>{label}</span>
      {count !== undefined && <span className="ck-count">{count}</span>}
    </div>
  );
}

function FeedRow({
  entry,
  playbackTimeMs,
  onSeek,
  showKindBadge,
  onRequestRemove,
}: {
  entry: FeedEntry;
  playbackTimeMs: number;
  onSeek?: (ms: number) => void;
  showKindBadge?: boolean;
  // Only wired up for manually-added errors (entry.ruleId === MANUAL_ERROR_RULE_ID)
  onRequestRemove?: (entry: FeedEntry) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasPassed = playbackTimeMs >= entry.timestamp;
  const style = FEED_KIND_STYLE[entry.kind];
  const roleColor = entry.role ? getRoleColor(entry.role) : style.color;
  const cls = entry.class ? getClassColor(entry.game, entry.class) : style.color;
  const specIcon = entry.class ? getPlayerSpecIcon(entry.game, entry.specId ?? 0, entry.class) : null;
  const specLabel = entry.class ? getSpecLabel(entry.game, entry.specId, entry.class) : null;
  const seekTarget = Math.max(0, entry.timestamp - 3000);

  const isDeletableManualError = entry.ruleId === MANUAL_ERROR_RULE_ID && !!entry.id && !!onRequestRemove;

  return (
    <div
      onClick={() => onSeek?.(seekTarget)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`ck-entry${onSeek ? " ck-entry--seekable" : ""}`}
      style={{
        // Left edge carries the severity colour; it brightens once the
        // playhead passes the entry.
        ["--ck-accent" as string]: hasPassed ? style.color : style.color + "55",
        backgroundColor: hovered
          ? `color-mix(in srgb, ${style.color} 10%, rgba(22,26,30,0.95))`
          : hasPassed
            ? `color-mix(in srgb, ${style.color} 7%, rgba(16,19,22,0.9))`
            : undefined,
      }}
    >
      <span
        className="ck-num"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: hasPassed ? "var(--ck-text-2)" : "var(--ck-text-3)",
          minWidth: "50px",
          flexShrink: 0,
          transition: "color 0.3s",
        }}
      >
        {formatMs(entry.timestamp)}
      </span>

      <SeverityIcon
        kind={entry.kind}
        size={16}
        color={style.color}
        style={{ opacity: hasPassed ? 1 : 0.3, transition: "opacity 0.3s" }}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            {specIcon && (
              <img
                src={specIcon}
                alt=""
                width={16}
                height={16}
                style={{ borderRadius: "3px", flexShrink: 0, opacity: hasPassed ? 1 : 0.4, transition: "opacity 0.3s" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <span
              style={{
                color: hasPassed ? cls : "#a3a3a3",
                fontWeight: 600,
                fontSize: "13px",
                transition: "color 0.3s",
              }}
            >
              {entry.player ?? "Raid-Wide"}
            </span>
            {specLabel && (
              <span style={{ fontSize: "10px", color: "var(--ck-text-3)", flexShrink: 0 }}>
                {specLabel}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
            <TitleIcon src={entry.titleIcon} abilityId={entry.abilityId} game={entry.game} />
            <div style={{ fontSize: "11px", fontWeight: 500, color: hasPassed ? style.color : "#b3984f", transition: "color 0.3s" }}>
              {entry.kind === "Death" ? "⚔ " : ""}{entry.title}
            </div>
          </div>
          {entry.subtitle && (
            <div style={{ fontSize: "11px", lineHeight: 1.4, color: "var(--ck-text-2)", marginTop: "2px" }}>
              {entry.subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
            {showKindBadge && (
              <span className="ck-badge" style={{ color: hasPassed ? style.color : "#8a8a8a", fontSize: "9px" }}>
                {style.label}
              </span>
            )}
            {entry.role && (
              <span className="ck-badge ck-badge--plain" style={{ color: hasPassed ? roleColor : "#8a8a8a", transition: "color 0.3s" }}>
                {entry.role}
              </span>
            )}
          </div>

          {isDeletableManualError && (
            <button
              className={`ck-btn ck-btn--xs${hovered ? " ck-btn--danger" : ""}`}
              onClick={(e) => { e.stopPropagation(); onRequestRemove?.(entry); }}
              title="Remove this error"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Non-interactive instrument (Duration). Same box as StatTabPill but no
// hover/active states, and centred so it doesn't read as a fifth tab.
function StatPill({ label, value, color = "var(--ck-text)" }: { label: string; value: string; color?: string }) {
  return (
    <div className="ck-stat" style={{ justifyContent: "center", textAlign: "center" }}>
      <div>
        <span className="ck-stat__label">{label}</span>
        <span className="ck-stat__value" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

// Only "Overall" and "Review" remain as a plain nav-style tab bar below the
// stats row — Deaths/Raid/Major/Minor moved up into the stat pills
// themselves (see StatTabPill below) so their counts can't wrap Minor onto
// a second row.
const BOTTOM_TABS: Tab[] = ["Overall", "Review"];

function TabBar({ value, onChange, counts }: { value: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number> }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        padding: "0 12px 8px",
        borderBottom: "1px solid var(--ck-line)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {BOTTOM_TABS.map((tab) => {
        const count = counts[tab];
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`ck-tab${tab === value ? " ck-tab--active" : ""}`}
          >
            {tab}
            {count > 0 && <span className="ck-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Doubles as both a stat display AND a tab-select button — replaces the
// plain (non-interactive) StatPill for Deaths/Raid/Major/Minor so the same
// row that used to just show counts now also drives tab selection, without
// adding a 5th/6th button elsewhere that could wrap onto a second row.
function StatTabPill({
  label,
  value,
  color,
  active,
  onClick,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  active: boolean;
  onClick: () => void;
  icon?: SeverityKind;
}) {
  // A zero count keeps its severity colour (the colour identifies the
  // category) and only gets a faint green wash to mark a clean result.
  const clear = value === "0";

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`ck-stat${clear ? " ck-stat--clear" : ""}${active ? " ck-stat--active" : ""}`}
      style={{ ["--ck-accent" as string]: color }}
    >
      {icon && (
        <SeverityIcon
          kind={icon}
          size={16}
          color={color}
          style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}
        />
      )}
      <span style={{ minWidth: 0 }}>
        <span className="ck-stat__label" style={active ? { color: "var(--ck-text-2)" } : undefined}>{label}</span>
        <span className="ck-stat__value" style={{ color }}>{value}</span>
      </span>
    </button>
  );
}

// Roster filter shared with RosterPanel.tsx — excludes the synthetic
// "Multiple Players" (Limit Break) actor and pets, so the Add Error
// dropdown only ever offers real players.
function filterRealPlayers(players: Pull["players"]) {
  return players.filter(
    (p) =>
      p.name !== "Multiple Players" &&
      p.specName !== "LimitBreak" &&
      p.specName !== "Limit Break"
  );
}

export default function AnalysisPanel({ pull, playbackTimeMs, onSeekToTime, onCallWipe, onAddError, onRemoveError, vodTimeAvailable }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Review");
  const [showAddErrorDialog, setShowAddErrorDialog] = useState(false);
  const [confirmRemoveWipe, setConfirmRemoveWipe] = useState(false);
  const [pendingRemoveEntry, setPendingRemoveEntry] = useState<FeedEntry | null>(null);

  if (!pull) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PanelHeader title="Pull Review" />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "28px", opacity: 0.5 }}>📋</span>
          <span style={{ fontSize: "13px", color: "var(--ck-text-3)", lineHeight: "1.5" }}>
            Select a pull to see its timeline
          </span>
        </div>
      </div>
    );
  }

  const isKill = pull.result === "Kill";

  const deaths = [...pull.deathEvents].sort((a, b) => a.timestamp - b.timestamp);
  const raids  = pull.errors.filter((e) => e.severity === "Raid").sort((a, b) => a.timestamp - b.timestamp);
  const majors = pull.errors.filter((e) => e.severity === "Major").sort((a, b) => a.timestamp - b.timestamp);
  const minors = pull.errors.filter((e) => e.severity === "Minor").sort((a, b) => a.timestamp - b.timestamp);

  const callWipeError = pull.errors.find((e) => e.ruleId === CALL_WIPE_RULE_ID);
  const rosterPlayers = filterRealPlayers(pull.players);

  const counts: Record<Tab, number> = {
    Overall: deaths.length + raids.length + majors.length + minors.length,
    Deaths:  deaths.length,
    Review:  raids.length + majors.length,
    Raid:    raids.length,
    Major:   majors.length,
    Minor:   minors.length,
  };

  function handleSeek(ms: number) {
    onSeekToTime?.(ms);
  }

  const feed: FeedEntry[] = (() => {
    switch (activeTab) {
      case "Overall":
        return [
          ...deaths.map((d) => deathToFeedEntry(d, pull.game)),
          ...raids.map((e) => errorToFeedEntry(e, pull.game)),
          ...majors.map((e) => errorToFeedEntry(e, pull.game)),
          ...minors.map((e) => errorToFeedEntry(e, pull.game)),
        ].sort((a, b) => a.timestamp - b.timestamp);
      case "Deaths":
        return deaths.map((d) => deathToFeedEntry(d, pull.game));
      case "Review":
        return [
          ...raids.map((e) => errorToFeedEntry(e, pull.game)),
          ...majors.map((e) => errorToFeedEntry(e, pull.game)),
        ].sort((a, b) => a.timestamp - b.timestamp);
      case "Raid":
        return raids.map((e) => errorToFeedEntry(e, pull.game));
      case "Major":
        return majors.map((e) => errorToFeedEntry(e, pull.game));
      case "Minor":
        return minors.map((e) => errorToFeedEntry(e, pull.game));
    }
  })();

  const emptyState: Record<Tab, { icon: string; text: string; color: string }> = {
    Overall: { icon: "✨", text: "No deaths or errors this pull", color: "#4ade80" },
    Deaths:  { icon: "✨", text: "No deaths this pull", color: "#4ade80" },
    Review:  { icon: "✨", text: "No raid or major errors this pull", color: "#4ade80" },
    Raid:    { icon: "✨", text: "No raid-wide errors this pull", color: "#4ade80" },
    Major:   { icon: "✨", text: "No major errors this pull", color: "#4ade80" },
    Minor:   { icon: "✨", text: "No minor errors this pull", color: "#4ade80" },
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PanelHeader title={pull.name} shrinkTitle>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span className="ck-badge" style={{ color: isKill ? "#4ade80" : "#f87171", fontSize: "11px" }}>
            {isKill ? "KILL" : "WIPE"}
          </span>

          {/* "Add Error" — sits to the left of Call Wipe */}
          {onAddError && (
            <button className="ck-btn ck-btn--arcane ck-btn--sm" onClick={() => setShowAddErrorDialog(true)}>
              Add Error
            </button>
          )}

          {/* "Call Wipe" — now a button when it exists, opening a confirm
              dialog to remove it, instead of a static badge. */}
          {callWipeError ? (
            <button
              className="ck-btn ck-btn--raid ck-btn--sm"
              onClick={() => setConfirmRemoveWipe(true)}
              title="Click to remove this wipe call"
              style={{ background: "linear-gradient(180deg, #34204d, #221535)" }}
            >
              <span className="ck-num">Wipe called {formatCallTime(callWipeError.timestamp)}</span>
            </button>
          ) : (
            onCallWipe && (
              <button className="ck-btn ck-btn--raid ck-btn--sm" onClick={() => onCallWipe(pull.id, playbackTimeMs)}>
                Call Wipe
              </button>
            )
          )}
        </div>
      </PanelHeader>

      <div
        style={{
          display: "grid",
          // Four stat tabs plus Duration, equal width so the row reads as
          // one instrument cluster.
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "6px",
          padding: "10px 12px 8px",
          flexShrink: 0,
        }}
      >
          <StatTabPill
            label="Deaths"
            icon="Death"
            value={String(deaths.length)}
            color={SEVERITY_COLOR.Death}
            active={activeTab === "Deaths"}
            onClick={() => setActiveTab("Deaths")}
          />
          <StatTabPill
            label="Raid"
            icon="Raid"
            value={String(raids.length)}
            color={SEVERITY_COLOR.Raid}
            active={activeTab === "Raid"}
            onClick={() => setActiveTab("Raid")}
          />
          <StatTabPill
            label="Major"
            icon="Major"
            value={String(majors.length)}
            color={SEVERITY_COLOR.Major}
            active={activeTab === "Major"}
            onClick={() => setActiveTab("Major")}
          />
          <StatTabPill
            label="Minor"
            icon="Minor"
            value={String(minors.length)}
            color={SEVERITY_COLOR.Minor}
            active={activeTab === "Minor"}
            onClick={() => setActiveTab("Minor")}
          />

        {/* Centred and without hover/active states — makes clear this one
            isn't clickable. */}
        <StatPill label="Duration" value={formatDuration(pull.fightDuration)} />
      </div>

      <TabBar value={activeTab} onChange={setActiveTab} counts={counts} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 12px 10px" }}>
        {feed.length > 0 ? (
          <>
            <SectionLabel label={activeTab} count={feed.length} />
            {feed.map((entry, i) => (
              <FeedRow
                key={entry.id ?? i}
                entry={entry}
                playbackTimeMs={playbackTimeMs}
                onSeek={onSeekToTime ? handleSeek : undefined}
                showKindBadge={activeTab === "Overall" || activeTab === "Review"}
                onRequestRemove={onRemoveError ? (e) => setPendingRemoveEntry(e) : undefined}
              />
            ))}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "16px 0 8px",
              color: emptyState[activeTab].color,
              fontSize: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{emptyState[activeTab].icon}</span>
            {emptyState[activeTab].text}
          </div>
        )}
      </div>

      <AddErrorDialog
        open={showAddErrorDialog}
        players={rosterPlayers}
        defaultTimestampMs={vodTimeAvailable ? playbackTimeMs : null}
        onCancel={() => setShowAddErrorDialog(false)}
        onAdd={(input) => {
          onAddError?.(pull.id, input);
          setShowAddErrorDialog(false);
        }}
      />

      <ConfirmDialog
        open={confirmRemoveWipe}
        title="Remove Wipe Call?"
        message="This will remove the manually-called wipe marker from this pull."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (callWipeError?.id) onRemoveError?.(pull.id, callWipeError.id);
          setConfirmRemoveWipe(false);
        }}
        onCancel={() => setConfirmRemoveWipe(false)}
      />

      <ConfirmDialog
        open={pendingRemoveEntry !== null}
        title="Remove this error?"
        message={pendingRemoveEntry ? `"${pendingRemoveEntry.title}" for ${pendingRemoveEntry.player ?? "Raid-Wide"} will be permanently removed.` : undefined}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (pendingRemoveEntry?.id) onRemoveError?.(pull.id, pendingRemoveEntry.id);
          setPendingRemoveEntry(null);
        }}
        onCancel={() => setPendingRemoveEntry(null)}
      />
    </div>
  );
}