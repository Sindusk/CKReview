// lib/usernames.ts
//
// Username normalization and the reserved list, ported from Stonks'
// lib/usernames.js so both apps refuse the same names in the shared
// `app_user` table. Roles are promoted by the owner directly in the users
// database, so nothing here grants privilege; the reserved list only stops
// a public signup from taking a name that reads as authoritative.

const DEFAULT_RESERVED = [
  "admin",
  "administrator",
  "moderator",
  "mod",
  "owner",
  "root",
  "system",
  "support",
  "security",
  "stonks",
  "ckreview",
  "consistencykings",
];

export const USERNAME_MAX_LENGTH = 32;

/** Lowercased and trimmed — the form stored in and queried from app_user. */
export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/** Extra reserved names for this deployment, comma-separated in RESERVED_USERNAMES. */
function configuredReserved(): string[] {
  return String(process.env.RESERVED_USERNAMES ?? "")
    .split(",")
    .map(normalizeUsername)
    .filter(Boolean);
}

export function isReservedUsername(username: string): boolean {
  const normalized = normalizeUsername(username);
  return DEFAULT_RESERVED.includes(normalized) || configuredReserved().includes(normalized);
}

/**
 * Null when acceptable, otherwise why not. The character rule applies to new
 * accounts only: existing names predate it and must keep logging in.
 */
export function validateNewUsername(username: string): string | null {
  const normalized = normalizeUsername(username);

  if (!normalized || normalized.length > USERNAME_MAX_LENGTH) {
    return `Username must be 1-${USERNAME_MAX_LENGTH} characters`;
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
    return "Username may use letters, numbers, dots, underscores, and hyphens, and must start with a letter or number";
  }
  if (isReservedUsername(normalized)) {
    return "That username is reserved";
  }

  return null;
}

/**
 * The starting username for an account created by Google sign-in: the
 * email's local part with anything the signup rule refuses stripped out.
 * The caller appends a number when this is taken or reserved.
 */
export function usernameBaseFromEmail(email: string | null): string {
  const local = normalizeUsername(email?.split("@")[0])
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "");
  // Leave room for a numeric suffix.
  return (local || "player").slice(0, USERNAME_MAX_LENGTH - 4);
}
