// lib/wcl-auth.ts
//
// WarcraftLogs OAuth 2.0 + PKCE (no client secret).
// Usage:
//   loginWithWarcraftLogs()     — redirects to WCL; persists code_verifier first
//   exchangeCodeForTokens(code) — called from /ckreview/callback
//   getAccessToken()            — use before every API call; auto-refreshes if needed
//   isAuthenticated()           — quick boolean for UI gating
//   logout()                    — clears all stored tokens

const CLIENT_ID   = "a22351f8-ab0e-4861-88c3-f27023c99156";
const AUTH_URL    = "https://www.warcraftlogs.com/oauth/authorize";
const TOKEN_URL   = "https://www.warcraftlogs.com/oauth/token";

function getRedirectUri(): string {
  if (typeof window === "undefined") {
    throw new Error("Redirect URI can only be resolved in the browser.");
  }

  return `${window.location.origin}/ckreview/callback`;
}

const STORAGE = {
  accessToken:  "wcl_access_token",
  refreshToken: "wcl_refresh_token",
  expiresAt:    "wcl_expires_at",
  codeVerifier: "wcl_code_verifier",
} as const;

// ─── PKCE Primitives ──────────────────────────────────────────────────────────

function getWebCrypto(): SubtleCrypto & Crypto {
  const crypto = (globalThis as any).crypto || (globalThis as any).msCrypto;
  if (!crypto || !crypto.subtle || !crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API unavailable. WarcraftLogs authentication requires a secure browser with window.crypto.subtle support."
    );
  }
  return crypto as SubtleCrypto & Crypto;
}

function randomString(length = 64): string {
  // Characters allowed by RFC 7636
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = new Uint8Array(length);
  getWebCrypto().getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const crypto = getWebCrypto();
  const data   = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  // base64url — no padding
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g,  "");
}

// ─── Public Auth API ──────────────────────────────────────────────────────────

/**
 * Generates a PKCE pair, stores the verifier, then redirects to WarcraftLogs.
 */
export async function loginWithWarcraftLogs(): Promise<void> {
  const verifier  = randomString();
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem(STORAGE.codeVerifier, verifier);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          getRedirectUri(),
    response_type:         "code",
    code_challenge:        challenge,
    code_challenge_method: "S256",
    scope:                 "view-user-profile view-private-reports",
  });

  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the authorization code (from the callback URL) for tokens.
 * Call this from /ckreview/callback after reading `?code=` from the URL.
 */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = localStorage.getItem(STORAGE.codeVerifier);
  if (!verifier) {
    throw new Error(
      "PKCE verifier missing — loginWithWarcraftLogs() must run in the same browser first."
    );
  }

  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    client_id:     CLIENT_ID,
    redirect_uri:  getRedirectUri(),
    code,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }

  storeTokens(await res.json());
  localStorage.removeItem(STORAGE.codeVerifier);
}

/**
 * Returns a valid access token, proactively refreshing if it's within
 * 60 s of expiry. Throws if the user has never authenticated.
 */
export async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem(STORAGE.accessToken);
  if (!token) throw new Error("Not authenticated — call loginWithWarcraftLogs()");

  const expiresAt  = Number(localStorage.getItem(STORAGE.expiresAt) ?? 0);
  const nearExpiry = Date.now() > expiresAt - 60_000;

  if (nearExpiry) {
    await refreshTokens();
    return localStorage.getItem(STORAGE.accessToken)!;
  }

  return token;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(STORAGE.accessToken);
}

export function logout(): void {
  Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function refreshTokens(): Promise<void> {
  const refreshToken = localStorage.getItem(STORAGE.refreshToken);
  if (!refreshToken) {
    throw new Error("No refresh token — user must log in again.");
  }

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }

  storeTokens(await res.json());
}

function storeTokens(data: {
  access_token:   string;
  refresh_token?: string;
  expires_in:     number;
}): void {
  localStorage.setItem(STORAGE.accessToken, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(STORAGE.refreshToken, data.refresh_token);
  }
  localStorage.setItem(
    STORAGE.expiresAt,
    String(Date.now() + data.expires_in * 1000)
  );
}
