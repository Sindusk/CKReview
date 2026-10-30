// ─── Burger menu icons ────────────────────────────────────────────────────────
//
// The gold-on-dark icon set from the "Consistency Kings Menu Icons" design
// canvas: 48×48 viewBox, gold body with a dark outline, status badge in the
// bottom-right. The fills reference gradients by id, so <MenuIconDefs /> must
// be rendered once wherever the icons appear (BurgerMenu does it inside the
// dropdown). <MenuIconTile> is the dark bevelled square each icon sits in.

import type { ReactNode } from "react";

export type MenuIconName =
  | "new-session"
  | "integration-connected"
  | "integration-disconnected"
  | "static-add-review"
  | "static-batch-import"
  | "static-manage"
  | "account"
  | "sign-in-methods"
  | "log-out"
  | "github-branch"
  | "privacy-policy"
  | "terms-of-service";

const INK = "#2B1B0A";

export function MenuIconDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="ckGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCE7A8" />
          <stop offset="0.45" stopColor="#E2B45A" />
          <stop offset="1" stopColor="#A8722A" />
        </linearGradient>
        <linearGradient id="ckGoldDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9A84E" />
          <stop offset="1" stopColor="#8E5E20" />
        </linearGradient>
        <linearGradient id="ckParch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8EACB" />
          <stop offset="1" stopColor="#D9BC82" />
        </linearGradient>
        <linearGradient id="ckRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B8432F" />
          <stop offset="1" stopColor="#6A1A13" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Gold "+" badge, shared by New Session and Add Review To Static.
function PlusBadge() {
  return (
    <>
      <circle cx="37" cy="37" r="9.5" fill="#17110b" />
      <circle cx="37" cy="37" r="7.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.4" />
      <path d="M37 33.2V40.8M33.2 37H40.8" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

const ICONS: Record<MenuIconName, ReactNode> = {
  "new-session": (
    <>
      <rect x="12" y="10" width="20" height="28" fill="url(#ckParch)" stroke={INK} strokeWidth="1.6" />
      <path d="M16 17H28M16 22H28M16 27H24" fill="none" stroke="#6B4A1E" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="8" y="5" width="28" height="7" rx="3.5" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <rect x="8" y="36" width="28" height="7" rx="3.5" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <PlusBadge />
    </>
  ),
  "integration-connected": (
    <>
      <g transform="rotate(-45 24 24)">
        <rect x="5" y="17" width="22" height="14" rx="7" fill="none" stroke={INK} strokeWidth="7.2" />
        <rect x="5" y="17" width="22" height="14" rx="7" fill="none" stroke="#E2B45A" strokeWidth="4.2" />
        <rect x="21" y="17" width="22" height="14" rx="7" fill="none" stroke={INK} strokeWidth="7.2" />
        <rect x="21" y="17" width="22" height="14" rx="7" fill="none" stroke="#E2B45A" strokeWidth="4.2" />
        <path d="M21 20.5V27.5" stroke="#FCE7A8" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      </g>
      <circle cx="37" cy="37" r="9.5" fill="#17110b" />
      <circle cx="37" cy="37" r="7.2" fill="#3E9A55" stroke="#123820" strokeWidth="1.4" />
      <path d="M33.6 37.2L36 39.6L40.6 34.6" fill="none" stroke="#F1FBF2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "integration-disconnected": (
    <>
      <g transform="rotate(-45 24 24)">
        <rect x="3" y="17" width="18" height="14" rx="7" fill="none" stroke={INK} strokeWidth="7.2" />
        <rect x="3" y="17" width="18" height="14" rx="7" fill="none" stroke="#B88A3E" strokeWidth="4.2" />
        <rect x="27" y="17" width="18" height="14" rx="7" fill="none" stroke={INK} strokeWidth="7.2" />
        <rect x="27" y="17" width="18" height="14" rx="7" fill="none" stroke="#B88A3E" strokeWidth="4.2" />
        <path d="M24 14.5V10.5M24 33.5V37.5M20.5 13.5L18.5 10.5M27.5 34.5L29.5 37.5" fill="none" stroke="#E2B45A" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <circle cx="37" cy="37" r="9.5" fill="#17110b" />
      <circle cx="37" cy="37" r="7.2" fill="#C0412F" stroke="#4A120B" strokeWidth="1.4" />
      <path d="M37 33.2V37.8" stroke="#FFF1EC" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="37" cy="40.6" r="1.3" fill="#FFF1EC" />
    </>
  ),
  "static-add-review": (
    <>
      <path d="M7 8H35" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M7 8H35" stroke="#C99645" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 9H32V38L21 31.5L10 38Z" fill="url(#ckRed)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12.8 11.8H29.2V33.2L21 28.4L12.8 33.2Z" fill="none" stroke="#D9A84E" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M15.5 24.5L14.5 16.5L18.3 19.8L21 14.5L23.7 19.8L27.5 16.5L26.5 24.5Z" fill="url(#ckGold)" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <circle cx="6.5" cy="8" r="2.4" fill="url(#ckGold)" stroke={INK} strokeWidth="1.2" />
      <circle cx="35.5" cy="8" r="2.4" fill="url(#ckGold)" stroke={INK} strokeWidth="1.2" />
      <PlusBadge />
    </>
  ),
  "static-batch-import": (
    <>
      <rect x="17" y="4" width="20" height="25" rx="2" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.6" />
      <rect x="12.5" y="8.5" width="20" height="25" rx="2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <rect x="8" y="13" width="20" height="27" rx="2" fill="url(#ckParch)" stroke={INK} strokeWidth="1.6" />
      <path d="M12 20H24M12 25H24M12 30H19" fill="none" stroke="#6B4A1E" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="37" cy="37" r="9.5" fill="#17110b" />
      <circle cx="37" cy="37" r="7.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.4" />
      <path d="M37 33V40.4M33.8 37.4L37 40.6L40.2 37.4" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "static-manage": (
    <>
      <circle cx="11.5" cy="17" r="4.8" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.5" />
      <path d="M2.5 33C2.5 26.8 6.2 24 11.5 24C16.8 24 20.5 26.8 20.5 33Z" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="34.5" cy="17" r="4.8" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.5" />
      <path d="M25.5 33C25.5 26.8 29.2 24 34.5 24C39.8 24 43.5 26.8 43.5 33Z" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="23" cy="15" r="6.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <path d="M11.5 38C11.5 29 16.4 25 23 25C29.6 25 34.5 29 34.5 38Z" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="37" cy="37" r="10.5" fill="#17110b" />
      <path d="M43.11 35.11 L45.48 35.55 L45.48 38.45 L43.11 38.89 L42.66 39.99 L44.02 41.96 L41.96 44.02 L39.99 42.66 L38.89 43.11 L38.45 45.48 L35.55 45.48 L35.11 43.11 L34.01 42.66 L32.04 44.02 L29.98 41.96 L31.34 39.99 L30.89 38.89 L28.52 38.45 L28.52 35.55 L30.89 35.11 L31.34 34.01 L29.98 32.04 L32.04 29.98 L34.01 31.34 L35.11 30.89 L35.55 28.52 L38.45 28.52 L38.89 30.89 L39.99 31.34 L41.96 29.98 L44.02 32.04 L42.66 34.01 Z" fill="url(#ckGold)" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="37" cy="37" r="2.6" fill={INK} />
    </>
  ),
  "account": (
    <>
      <circle cx="24" cy="16" r="8.5" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <path d="M8 42C8 31.5 14.5 27 24 27C33.5 27 40 31.5 40 42Z" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19.5 27.6L24 33L28.5 27.6" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "sign-in-methods": (
    <>
      <path d="M16 22V16.5A8 8 0 0 1 32 16.5V22" fill="none" stroke={INK} strokeWidth="7.2" />
      <path d="M16 22V16.5A8 8 0 0 1 32 16.5V22" fill="none" stroke="#C99645" strokeWidth="4.2" />
      <rect x="10" y="21" width="28" height="21" rx="3.5" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <circle cx="24" cy="29.5" r="2.8" fill={INK} />
      <path d="M22.6 31L21.8 36.5H26.2L25.4 31Z" fill={INK} />
    </>
  ),
  "log-out": (
    <>
      <rect x="6" y="5" width="22" height="38" rx="1.5" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.6" />
      <rect x="10" y="9" width="14" height="9" rx="1" fill="none" stroke={INK} strokeWidth="1.3" />
      <rect x="10" y="30" width="14" height="9" rx="1" fill="none" stroke={INK} strokeWidth="1.3" />
      <circle cx="11" cy="24" r="1.6" fill={INK} />
      <path d="M18 20H31V14.5L42.5 24L31 33.5V28H18Z" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  "github-branch": (
    <>
      <path d="M15 13V35M33 15C33 25 15 21 15 31" fill="none" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M15 13V35M33 15C33 25 15 21 15 31" fill="none" stroke="#D9A84E" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="15" cy="10" r="5.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <circle cx="15" cy="38" r="5.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <circle cx="33" cy="12" r="5.2" fill="url(#ckGold)" stroke={INK} strokeWidth="1.6" />
      <circle cx="15" cy="10" r="1.8" fill={INK} />
      <circle cx="15" cy="38" r="1.8" fill={INK} />
      <circle cx="33" cy="12" r="1.8" fill={INK} />
    </>
  ),
  "privacy-policy": (
    <>
      <path d="M24 4.5L39.5 10V23C39.5 33.2 32.6 39.8 24 43.5C15.4 39.8 8.5 33.2 8.5 23V10Z" fill="url(#ckGold)" />
      <path d="M24 4.5L39.5 10V23C39.5 33.2 32.6 39.8 24 43.5Z" fill="url(#ckGoldDeep)" />
      <path d="M24 4.5L39.5 10V23C39.5 33.2 32.6 39.8 24 43.5C15.4 39.8 8.5 33.2 8.5 23V10Z" fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M24 8.6L36 12.8V23C36 31 30.8 36.4 24 39.6C17.2 36.4 12 31 12 23V12.8Z" fill="none" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" opacity="0.55" />
      <path d="M15.5 24C18 20.3 20.8 18.8 24 18.8C27.2 18.8 30 20.3 32.5 24C30 27.7 27.2 29.2 24 29.2C20.8 29.2 18 27.7 15.5 24Z" fill={INK} />
      <circle cx="24" cy="24" r="2.8" fill="#E2B45A" />
      <path d="M17 31L31 17" stroke="#E9C377" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M17 31L31 17" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  "terms-of-service": (
    <>
      <path d="M11 4.5H29.5L37 12V43.5H11Z" fill="url(#ckParch)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M29.5 4.5V12H37Z" fill="url(#ckGoldDeep)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 15H25M15 20H32M15 25H32M15 30H23" fill="none" stroke="#6B4A1E" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27 38.5L25.5 45.5L28.6 44L30.4 46.6L31.2 40Z" fill="#7A1F18" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M35 38.5L36.5 45.5L33.4 44L31.6 46.6L30.8 40Z" fill="#7A1F18" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="31" cy="35" r="6.2" fill="url(#ckRed)" stroke={INK} strokeWidth="1.4" />
      <circle cx="31" cy="35" r="3.6" fill="none" stroke="#E2A95A" strokeWidth="1.1" />
    </>
  ),
};

export function MenuIconTile({ name, disabled }: { name: MenuIconName; disabled?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width:          "40px",
        height:         "40px",
        flex:           "none",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        boxSizing:      "border-box",
        borderRadius:   "8px",
        background:     "linear-gradient(180deg, #221a11, #130e09)",
        border:         "1px solid #6B5230",
        boxShadow:      "inset 0 0 0 2px #100b07, inset 0 0 0 3px #3A2C1A",
        opacity:        disabled ? 0.45 : 1,
        filter:         disabled ? "grayscale(0.6)" : undefined,
      }}
    >
      <svg viewBox="0 0 48 48" width="32" height="32">
        {ICONS[name]}
      </svg>
    </span>
  );
}
