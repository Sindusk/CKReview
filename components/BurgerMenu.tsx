"use client";

import { useState, useEffect, useRef } from "react";
import { isAuthenticated, isFFAuthenticated } from "@/lib/log-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BurgerMenuProps = {
  onConnectWCL: () => void;
  onConnectFFL: () => void;
  onAddReviewToStatic: () => void;
  onManageStatics:     () => void;
  onLogin:              () => void;
  onLogout:             () => void;
  currentUser:          { username: string; role: string } | null;
  hasActiveSession:     boolean;
};

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <div className="ck-menu-label">{label}</div>;
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
  return (
    <button className="ck-menu-item" onClick={onClick} disabled={disabled}>
      <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0, opacity: disabled ? 0.4 : 1 }}>
        {icon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <span>{label}</span>
        {sublabel && (
          <span style={{ fontSize: "11px", color: "var(--ck-text-3)", opacity: disabled ? 0.6 : 1 }}>
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Menu Link Item ───────────────────────────────────────────────────────────
//
// Same visual treatment as MenuItem, but for links (an <a>, not a
// <button> — MenuItem's onClick is for in-app actions, this is for
// navigating away). `newTab` defaults to true (external references like the
// GitHub link); pass `newTab={false}` for actions that should replace the
// current tab, like "New Session".

function MenuLinkItem({
  icon,
  label,
  href,
  onNavigate,
  newTab = true,
}: {
  icon:       string;
  label:      string;
  href:       string;
  onNavigate?: () => void;
  newTab?:    boolean;
}) {
  return (
    <a
      className="ck-menu-item"
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onClick={onNavigate}
    >
      <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BurgerMenu({
  onConnectWCL,
  onConnectFFL,
  onAddReviewToStatic,
  onManageStatics,
  onLogin,
  onLogout,
  currentUser,
  hasActiveSession,
}: BurgerMenuProps) {
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

  function handleAddReviewToStatic() {
    setOpen(false);
    onAddReviewToStatic();
  }

  function handleManageStatics() {
    setOpen(false);
    onManageStatics();
  }

  function handleLogin() {
    setOpen(false);
    onLogin();
  }

  function handleLogout() {
    setOpen(false);
    onLogout();
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
        className="ck-btn"
        style={{
          flexDirection:  "column",
          alignItems:     "stretch",
          gap:            "5px",
          width:          "40px",
          height:         "40px",
          padding:        "8px",
          ...(open ? { borderColor: "rgba(225,189,106,0.85)" } : {}),
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display:         "block",
              height:          "2px",
              borderRadius:    "2px",
              backgroundColor: "var(--ck-text-gold)",
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
          className="ck-menu"
          style={{
            position: "absolute",
            top:      "calc(100% + 8px)",
            left:     0,
            minWidth: "260px",
            padding:  "6px",
            zIndex:   300,
          }}
        >
          {/* ── Review ── */}
          <SectionLabel label="Review" />

          <MenuLinkItem
            icon="🆕"
            label="New Session"
            href="https://review.consistencykings.com/"
            newTab={false}
            onNavigate={() => setOpen(false)}
          />

          {/* Thin rule between sections */}
          <div className="ck-menu-divider" />

          {/* ── Integrations ── */}
          <SectionLabel label="Integrations" />

          {/* Both states open the API client setup dialog, so a connected
              user can still change or remove their client ID there. */}
          {fflReady ? (
            <MenuItem
              icon="✅"
              label="FFLogs Connected"
              sublabel="Manage your FFLogs API client"
              onClick={handleConnectFFL}
            />
          ) : (
            <MenuItem
              icon="🎮"
              label="Connect FFLogs"
              sublabel="Add your API client to import FFXIV reports"
              onClick={handleConnectFFL}
            />
          )}

          {wclReady ? (
            <MenuItem
              icon="✅"
              label="WarcraftLogs Connected"
              sublabel="Manage your WarcraftLogs API client"
              onClick={handleConnectWCL}
            />
          ) : (
            <MenuItem
              icon="📊"
              label="Connect WarcraftLogs"
              sublabel="Add your API client to import WoW reports"
              onClick={handleConnectWCL}
            />
          )}

          {/* Thin rule between sections */}
          <div className="ck-menu-divider" />

          {/* ── Statics ── */}
          <SectionLabel label="Statics" />

          <MenuItem
            icon="➕"
            label="Add Review To Static"
            sublabel={hasActiveSession ? "Save the current review to a static" : "Save some progress first"}
            onClick={handleAddReviewToStatic}
            disabled={!hasActiveSession}
          />

          <MenuItem
            icon="🛠️"
            label="Manage Statics"
            sublabel="Create or delete your statics"
            onClick={handleManageStatics}
          />

          {/* Thin rule between sections */}
          <div className="ck-menu-divider" />

          {/* ── Account ── */}
          <SectionLabel label="Account" />

          {currentUser ? (
            <>
              <MenuItem
                icon="👤"
                label={currentUser.username}
                sublabel={currentUser.role}
                disabled
              />
              <MenuItem
                icon="🚪"
                label="Log Out"
                onClick={handleLogout}
              />
            </>
          ) : (
            <MenuItem
              icon="🔑"
              label="Log In"
              sublabel="Required to use Statics"
              onClick={handleLogin}
            />
          )}

          {/* Thin rule between sections */}
          <div className="ck-menu-divider" />

          {/* ── About ── */}
          <SectionLabel label="About" />

          <MenuLinkItem
            icon="🐙"
            label="View on GitHub"
            href="https://github.com/Sindusk/CKReview"
            onNavigate={() => setOpen(false)}
          />

          {/*
            ── Add future menu items below ──
          */}
        </div>
      )}
    </div>
  );
}
