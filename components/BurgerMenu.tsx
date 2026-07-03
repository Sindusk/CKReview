"use client";

import { useState, useEffect, useRef } from "react";
import { isAuthenticated } from "@/lib/wcl-auth";
import { isFFAuthenticated } from "@/lib/ffl-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BurgerMenuProps = {
  onConnectWCL: () => void;
  onConnectFFL: () => void;
  onOpenReport: () => void;
};

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize:      "10px",
        color:         "#555",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding:       "4px 14px 6px",
      }}
    >
      {label}
    </div>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon:      string;
  label:     string;
  sublabel?: string;
  onClick?:  () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
        width:        "100%",
        padding:      "9px 14px",
        background:   !disabled && hovered ? "#2a2a2a" : "transparent",
        border:       "none",
        borderRadius: "5px",
        color:        disabled ? "#555" : hovered ? "#fff" : "#ccc",
        fontSize:     "13px",
        cursor:       disabled ? "default" : "pointer",
        textAlign:    "left",
        transition:   "background 0.1s, color 0.1s",
      }}
    >
      <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <span>{label}</span>
        {sublabel && (
          <span style={{ fontSize: "11px", color: disabled ? "#3a3a3a" : "#555" }}>
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BurgerMenu({ onConnectWCL, onConnectFFL, onOpenReport }: BurgerMenuProps) {
  const [open, setOpen]         = useState(false);
  const [wclReady, setWclReady] = useState(false);
  const [fflReady, setFflReady] = useState(false);
  const containerRef            = useRef<HTMLDivElement>(null);

  // Read localStorage only on the client to avoid SSR mismatch.
  // Re-check every time the menu opens so state reflects any mid-session changes.
  useEffect(() => {
    setWclReady(isAuthenticated());
    setFflReady(isFFAuthenticated());
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleConnectWCL() {
    setOpen(false);
    onConnectWCL();
  }

  function handleConnectFFL() {
    setOpen(false);
    onConnectFFL();
  }

  function handleOpenReport() {
    setOpen(false);
    onOpenReport();
  }

  return (
    // position: relative here so the dropdown can use position: absolute
    // without being clipped by parent overflow. The zIndex on the dropdown
    // itself must exceed anything in the layout below the header.
    <div ref={containerRef} style={{ position: "relative", width: "120px", zIndex: 200 }}>
      {/* Burger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        style={{
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "center",
          gap:            "5px",
          width:          "40px",
          height:         "40px",
          padding:        "8px",
          background:     open ? "#2a2a2a" : "transparent",
          border:         "1px solid",
          borderColor:    open ? "#555" : "#333",
          borderRadius:   "6px",
          cursor:         "pointer",
          transition:     "background 0.15s, border-color 0.15s",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display:         "block",
              height:          "2px",
              borderRadius:    "2px",
              backgroundColor: "#ccc",
              transition:      "transform 0.2s, opacity 0.2s",
              transformOrigin: "center",
              opacity:    open && i === 1 ? 0 : 1,
              transform:
                open && i === 0 ? "translateY(7px) rotate(45deg)"   :
                open && i === 2 ? "translateY(-7px) rotate(-45deg)" :
                "none",
            }}
          />
        ))}
      </button>

      {/* Dropdown
          zIndex: 300 ensures it renders above the grid panels (border/background
          elements) that sit below the header in the page layout. */}
      {open && (
        <div
          style={{
            position:        "absolute",
            top:             "calc(100% + 8px)",
            left:            0,
            minWidth:        "260px",
            backgroundColor: "#1a1a1a",
            border:          "1px solid #333",
            borderRadius:    "8px",
            padding:         "6px",
            boxShadow:       "0 8px 24px rgba(0,0,0,0.6)",
            zIndex:          300,
          }}
        >
          {/* ── WarcraftLogs ── */}
          <SectionLabel label="WarcraftLogs" />

          {wclReady ? (
            <MenuItem
              icon="✅"
              label="WarcraftLogs Connected"
              sublabel="Ready to import WoW reports"
              disabled
            />
          ) : (
            <MenuItem
              icon="📊"
              label="Connect WarcraftLogs"
              sublabel="Authorize to import WoW reports"
              onClick={handleConnectWCL}
            />
          )}

          {/* Thin rule between sections */}
          <div style={{ height: "1px", backgroundColor: "#2a2a2a", margin: "6px 8px" }} />

          {/* ── FFLogs ── */}
          <SectionLabel label="FFLogs" />

          {fflReady ? (
            <MenuItem
              icon="✅"
              label="FFLogs Connected"
              sublabel="Ready to import FFXIV reports"
              disabled
            />
          ) : (
            <MenuItem
              icon="🎮"
              label="Connect FFLogs"
              sublabel="Authorize to import FFXIV reports"
              onClick={handleConnectFFL}
            />
          )}

          {/* Thin rule between sections */}
          <div style={{ height: "1px", backgroundColor: "#2a2a2a", margin: "6px 8px" }} />

          {/* ── Report ── */}
          <SectionLabel label="Raid Review" />

          <MenuItem
            icon="📋"
            label="View Report"
            sublabel="First errors, MVPs, and raid uptime"
            onClick={handleOpenReport}
          />

          {/*
            ── Add future menu items below ──
          */}
        </div>
      )}
    </div>
  );
}
