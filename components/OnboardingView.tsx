"use client";

import { useState, type ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { LineGlyph, type LineGlyphName } from "@/components/ui/LineGlyph";
import type { LogProvider } from "@/components/LogApiSetupDialog";

/*
  The opening screen (docs/app-architecture.md, "Opening screen"): shown in place of
  the panel grid while no report is loaded and no VOD has been added. One
  import entry point (the toolbar import is hidden while this shows), and a
  three-step strip — Connect to Logs, Import Report, Review — whose first
  token carries a check once either log provider is connected.

  The import progress bar is page.tsx's WCLImportBar, passed in as
  `progress`, so the importing state has one implementation.
*/

type Glyph = LineGlyphName;

function GlyphIcon({ name, size }: { name: Glyph | "link"; size: number }) {
  return <LineGlyph name={name === "link" ? "connect" : name} size={size} />;
}

type StepState = "done" | "current" | "todo";

function StepToken({ n, glyph, state }: { n: number; glyph: Glyph; state: StepState }) {
  const lit = state !== "todo";
  return (
    <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto" }}>
      <div
        style={{
          width:          64,
          height:         64,
          boxSizing:      "border-box",
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          color:          lit ? "var(--ck-text-gold)" : "var(--ck-text-2)",
          background:     "radial-gradient(circle at 50% 35%, #1d2026, #0c0e12)",
          border:         `2px solid ${lit ? "rgba(225, 189, 106, 0.9)" : "rgba(185, 134, 50, 0.4)"}`,
          boxShadow:      state === "current" ? "0 0 0 3px rgba(185, 134, 50, 0.18), 0 0 14px rgba(211, 158, 65, 0.25)" : undefined,
        }}
      >
        <GlyphIcon name={glyph} size={28} />
      </div>
      {/* The number badge, or a check once the step is done. */}
      <div
        style={{
          position:       "absolute",
          left:           "50%",
          bottom:         -11,
          transform:      "translateX(-50%)",
          width:          22,
          height:         22,
          boxSizing:      "border-box",
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       12,
          fontWeight:     700,
          background:     state === "done" ? "linear-gradient(180deg, #fce7a8, #c08a35)" : "#0c0e12",
          color:          state === "done" ? "#2b1b0a" : lit ? "var(--ck-text-gold)" : "var(--ck-text-2)",
          border:         `1.5px solid ${lit ? "rgba(225, 189, 106, 0.9)" : "rgba(185, 134, 50, 0.4)"}`,
        }}
      >
        {state === "done" ? (
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Done">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : n}
      </div>
    </div>
  );
}

function Step({ n, glyph, state, title, children }: {
  n: number; glyph: Glyph; state: StepState; title: string; children: ReactNode;
}) {
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, textAlign: "center" }}>
      <StepToken n={n} glyph={glyph} state={state} />
      <div style={{
        marginTop:  20,
        fontFamily: "var(--font-cinzel), serif",
        fontSize:   16,
        fontWeight: 700,
        color:      state === "todo" ? "var(--ck-text)" : "var(--ck-text-gold)",
      }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45, color: "var(--ck-text-2)" }}>{children}</div>
    </div>
  );
}

function StepConnector() {
  return <div aria-hidden="true" style={{ flex: "0 0 56px", marginTop: 32, borderTop: "1px dashed rgba(185, 134, 50, 0.45)" }} />;
}

export default function OnboardingView({
  value,
  onChange,
  onImport,
  importing,
  progress,
  error,
  liveLogEnabled,
  onLiveLogEnabledChange,
  connected,
  onConnect,
}: {
  value:                  string;
  onChange:               (v: string) => void;
  onImport:               (url: string) => void;
  importing:              boolean;
  /** The import progress bar, shown in place of the URL field while importing. */
  progress:               ReactNode;
  error:                  string | null;
  liveLogEnabled:         boolean;
  onLiveLogEnabledChange: (v: boolean) => void;
  connected:              { wcl: boolean; ffl: boolean };
  onConnect:              (provider: LogProvider) => void;
}) {
  const [focused, setFocused] = useState(false);
  const anyConnected = connected.wcl || connected.ffl;

  function submit() {
    const trimmed = value.trim();
    if (trimmed) onImport(trimmed);
  }

  // Same rule as WCLImportBar: an error asking to connect a provider gets a
  // button that opens that provider's setup dialog.
  const connectMatch = error?.match(/"Connect (FFLogs|WarcraftLogs)"/);
  const connectProvider: LogProvider | null = connectMatch ? (connectMatch[1] === "FFLogs" ? "ffl" : "wcl") : null;

  const connectedNames = [connected.ffl && "FF Logs", connected.wcl && "Warcraft Logs"].filter(Boolean).join(" and ");

  return (
    <div style={{
      flex:           1,
      minHeight:      0,
      overflow:       "auto",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "24px 16px",
    }}>
      <Panel
        diamondBottom
        style={{ width: "100%", maxWidth: 820 }}
        bodyStyle={{ padding: "40px 48px 36px", alignItems: "center", textAlign: "center" }}
      >
        <h1 style={{
          margin:        0,
          fontFamily:    "var(--font-cinzel), serif",
          fontSize:      40,
          fontWeight:    700,
          letterSpacing: "0.03em",
          lineHeight:    1.1,
          color:         "var(--ck-text-gold)",
          textShadow:    "0 2px 2px #000, 0 0 18px rgba(211, 158, 65, 0.2)",
        }}>
          Start a Raid Review
        </h1>
        <p style={{ margin: "12px auto 0", maxWidth: 520, fontSize: 15, lineHeight: 1.5, color: "var(--ck-text-2)" }}>
          Import a Warcraft Logs or FF Logs report to analyze your raid, review
          pulls, and watch VODs all in one place.
        </p>

        <div style={{
          width:        "100%",
          boxSizing:    "border-box",
          marginTop:    28,
          padding:      "18px 22px 14px",
          textAlign:    "left",
          border:       "1px solid var(--ck-frame-soft)",
          borderRadius: 6,
          background:   "rgba(8, 10, 14, 0.6)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--ck-text-2)", marginBottom: 10 }}>
            <GlyphIcon name="link" size={15} />
            REPORT URL
          </div>

          {importing ? (
            <div style={{ display: "flex", minHeight: 40 }}>{progress}</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: focused ? "var(--ck-arcane-text)" : "var(--ck-text-3)", pointerEvents: "none" }}>
                    <GlyphIcon name="link" size={17} />
                  </span>
                  <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Paste a Warcraft Logs or FF Logs report URL…"
                    className="ck-field"
                    autoFocus
                    style={{ width: "100%", boxSizing: "border-box", height: 42, paddingLeft: 38, fontSize: 14 }}
                  />
                </div>
                <button className="ck-btn ck-btn--lg" onClick={submit} disabled={!value.trim()} style={{ height: 42, fontSize: 14, gap: 8 }}>
                  <GlyphIcon name="upload" size={18} />
                  Import
                </button>
              </div>

              <label
                title="Keep checking this report for new fights and import them automatically as they occur"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 13, color: "var(--ck-text-2)", cursor: "pointer" }}
              >
                <input type="checkbox" checked={liveLogEnabled} onChange={e => onLiveLogEnabledChange(e.target.checked)} />
                Live log — keep importing new pulls as they happen
              </label>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 13, color: "#f87171" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
                  {connectProvider && (
                    <button className="ck-btn ck-btn--primary" onClick={() => onConnect(connectProvider)} style={{ whiteSpace: "nowrap" }}>
                      Connect {connectProvider === "ffl" ? "FFLogs" : "WarcraftLogs"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", width: "100%", marginTop: 32 }}>
          <Step n={1} glyph="connect" state={anyConnected ? "done" : "current"} title="Connect to Logs">
            {anyConnected ? (
              <>{connectedNames} connected.</>
            ) : (
              <>
                Link your log API client:{" "}
                <button onClick={() => onConnect("ffl")} style={linkStyle}>FF Logs</button>
                {" or "}
                <button onClick={() => onConnect("wcl")} style={linkStyle}>Warcraft Logs</button>
              </>
            )}
          </Step>
          <StepConnector />
          <Step n={2} glyph="import" state={anyConnected ? "current" : "todo"} title="Import Report">
            Paste a report URL above and import it.
          </Step>
          <StepConnector />
          <Step n={3} glyph="review" state="todo" title="Review">
            Pick a pull to see its errors, and add a VOD to watch alongside.
          </Step>
        </div>
      </Panel>
    </div>
  );
}

const linkStyle = {
  padding:        0,
  border:         "none",
  background:     "none",
  font:           "inherit",
  color:          "var(--ck-arcane-text)",
  textDecoration: "underline",
  cursor:         "pointer",
} as const;
