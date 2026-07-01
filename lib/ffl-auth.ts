// lib/ffl-auth.ts
//
// FFLogs OAuth 2.0 + PKCE (public client — no client secret).
// Usage:
//   loginWithFFLogs()              — redirects to FFLogs; persists code_verifier first
//   exchangeFFCodeForTokens(code)  — called from /ckreview/ffcallback
//   getFFAccessToken()             — use before every API call; auto-refreshes if needed
//   isFFAuthenticated()            — quick boolean for UI gating
//   ffLogout()                     — clears all stored tokens

const CLIENT_ID = "a225e605-1025-4b97-ad2f-b71347ca2e64";
const AUTH_URL  = "https://www.fflogs.com/oauth/authorize";
const TOKEN_URL = "https://www.fflogs.com/oauth/token";

const REDIRECT_URI = "http://consistencykings.com/ckreview/ffcallback";

const STORAGE = {
  accessToken:  "ffl_access_token",
  refreshToken: "ffl_refresh_token",
  expiresAt:    "ffl_expires_at",
  codeVerifier: "ffl_code_verifier",
} as const;

// ─── PKCE Primitives ──────────────────────────────────────────────────────────

function getWebCrypto(): Crypto {
  const crypto = (globalThis as any).crypto || (globalThis as any).msCrypto;
  if (!crypto || !crypto.subtle || !crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API unavailable. FFLogs authentication requires a secure browser with window.crypto.subtle support."
    );
  }
  return crypto as Crypto;
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
 * Generates a PKCE pair, stores the verifier, then redirects to FFLogs.
 */
export async function loginWithFFLogs(): Promise<void> {
  const verifier  = randomString();
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem(STORAGE.codeVerifier, verifier);

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         "code",
    code_challenge:        challenge,
    code_challenge_method: "S256",
    scope:                 "view-user-profile view-private-reports",
  });

  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the authorization code (from the callback URL) for tokens.
 * Call this from /ckreview/ffcallback after reading `?code=` from the URL.
 *
 * FFLogs uses Laravel Passport. For public PKCE clients the correct pattern is:
 *   - client_id in the POST body (no Authorization header)
 *   - client_secret omitted entirely (not even an empty string)
 *   - scope repeated here to match the authorize request
 */
export async function exchangeFFCodeForTokens(code: string): Promise<void> {
  const verifier = localStorage.getItem(STORAGE.codeVerifier);
  if (!verifier) {
    throw new Error(
      "PKCE verifier missing — loginWithFFLogs() must run in the same browser first."
    );
  }

  const body = new URLSearchParams({
    grant_type:    "authorization_code",
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    code,
    code_verifier: verifier,
    scope:         "view-user-profile view-private-reports",
  });

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`FFLogs token exchange failed (${res.status}): ${await res.text()}`);
  }

  storeTokens(await res.json());
  localStorage.removeItem(STORAGE.codeVerifier);
}

/**
 * Returns a valid access token, proactively refreshing if within 60s of expiry.
 * Throws if the user has never authenticated.
 */
export async function getFFAccessToken(): Promise<string> {
  const token = localStorage.getItem(STORAGE.accessToken);
  if (!token) throw new Error("Not authenticated with FFLogs — call loginWithFFLogs()");

  const expiresAt  = Number(localStorage.getItem(STORAGE.expiresAt) ?? 0);
  const nearExpiry = Date.now() > expiresAt - 60_000;

  if (nearExpiry) {
    await refreshTokens();
    return localStorage.getItem(STORAGE.accessToken)!;
  }

  return token;
}

export function isFFAuthenticated(): boolean {
  return !!localStorage.getItem(STORAGE.accessToken);
}

export function ffLogout(): void {
  Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function refreshTokens(): Promise<void> {
  const refreshToken = localStorage.getItem(STORAGE.refreshToken);
  if (!refreshToken) {
    throw new Error("No FFLogs refresh token — user must log in again.");
  }

  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`FFLogs token refresh failed (${res.status}): ${await res.text()}`);
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
