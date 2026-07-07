// lib/log-auth.ts
//
// OAuth 2.0 + PKCE for both WarcraftLogs and FFLogs (public clients — no
// client secret). Both APIs are Laravel Passport instances with an
// identical PKCE flow, so the mechanics (code verifier/challenge, token
// storage, refresh-on-expiry) are implemented once via createLogAuth()
// and configured twice below, instead of maintaining two near-identical
// ~150-line files that only differed in URLs/IDs/storage keys.
//
// Usage (WarcraftLogs):
//   loginWithWarcraftLogs()     — redirects to WCL; persists code_verifier first
//   exchangeCodeForTokens(code) — called from /ckreview/callback
//   getAccessToken()            — use before every API call; auto-refreshes if needed
//   isAuthenticated()           — quick boolean for UI gating
//   logout()                    — clears all stored tokens
//
// Usage (FFLogs) — same shape, FFLogs-flavored names:
//   loginWithFFLogs(), exchangeFFCodeForTokens(code), getFFAccessToken(),
//   isFFAuthenticated(), ffLogout()

// ─── PKCE primitives (shared) ───────────────────────────────────────────────

function getWebCrypto(): Crypto {
  const crypto = (globalThis as any).crypto || (globalThis as any).msCrypto;
  if (!crypto || !crypto.subtle || !crypto.getRandomValues) {
    throw new Error(
      "Web Crypto API unavailable. Authentication requires a secure browser with window.crypto.subtle support."
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

// ─── Generic provider factory ───────────────────────────────────────────────

type TokenResponse = {
  access_token:   string;
  refresh_token?: string;
  expires_in:     number;
};

type ProviderStorageKeys = {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    string;
  codeVerifier: string;
};

type ProviderConfig = {
  providerLabel:  string;              // used in error messages, e.g. "FFLogs"
  clientId:       string;
  authUrl:        string;
  tokenUrl:       string;
  scope:          string;
  getRedirectUri: () => string;
  storageKeys:    ProviderStorageKeys;
  // WCL's original token-exchange request omitted `scope` from the POST
  // body; FFLogs' included it ("scope repeated here to match the authorize
  // request" per Laravel Passport's PKCE quirks). Preserved per-provider
  // rather than unified, since it's a real behavioral difference, not
  // incidental duplication.
  includeScopeInExchange?: boolean;
};

function createLogAuth(config: ProviderConfig) {
  const { providerLabel, clientId, authUrl, tokenUrl, scope, getRedirectUri, storageKeys, includeScopeInExchange } = config;

  function storeTokens(data: TokenResponse): void {
    localStorage.setItem(storageKeys.accessToken, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(storageKeys.refreshToken, data.refresh_token);
    }
    localStorage.setItem(storageKeys.expiresAt, String(Date.now() + data.expires_in * 1000));
  }

  /**
   * Generates a PKCE pair, stores the verifier, then redirects to the provider.
   */
  async function login(): Promise<void> {
    const verifier  = randomString();
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem(storageKeys.codeVerifier, verifier);

    const params = new URLSearchParams({
      client_id:             clientId,
      redirect_uri:          getRedirectUri(),
      response_type:         "code",
      code_challenge:        challenge,
      code_challenge_method: "S256",
      scope,
    });

    window.location.href = `${authUrl}?${params.toString()}`;
  }

  /**
   * Exchanges the authorization code (from the callback URL) for tokens.
   */
  async function exchangeCodeForTokens(code: string): Promise<void> {
    const verifier = localStorage.getItem(storageKeys.codeVerifier);
    if (!verifier) {
      throw new Error(
        `PKCE verifier missing — the ${providerLabel} login must run in the same browser first.`
      );
    }

    const body = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     clientId,
      redirect_uri:  getRedirectUri(),
      code,
      code_verifier: verifier,
      ...(includeScopeInExchange ? { scope } : {}),
    });

    const res = await fetch(tokenUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });

    if (!res.ok) {
      throw new Error(`${providerLabel} token exchange failed (${res.status}): ${await res.text()}`);
    }

    storeTokens(await res.json());
    localStorage.removeItem(storageKeys.codeVerifier);
  }

  async function refreshTokens(): Promise<void> {
    const refreshToken = localStorage.getItem(storageKeys.refreshToken);
    if (!refreshToken) {
      throw new Error(`No ${providerLabel} refresh token — user must log in again.`);
    }

    const body = new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     clientId,
      refresh_token: refreshToken,
    });

    const res = await fetch(tokenUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });

    if (!res.ok) {
      throw new Error(`${providerLabel} token refresh failed (${res.status}): ${await res.text()}`);
    }

    storeTokens(await res.json());
  }

  /**
   * Returns a valid access token, proactively refreshing if within 60s of
   * expiry. Throws if the user has never authenticated.
   */
  async function getAccessToken(): Promise<string> {
    const token = localStorage.getItem(storageKeys.accessToken);
    if (!token) throw new Error(`Not authenticated with ${providerLabel} — call login first`);

    const expiresAt  = Number(localStorage.getItem(storageKeys.expiresAt) ?? 0);
    const nearExpiry = Date.now() > expiresAt - 60_000;

    if (nearExpiry) {
      await refreshTokens();
      return localStorage.getItem(storageKeys.accessToken)!;
    }

    return token;
  }

  function isAuthenticated(): boolean {
    return !!localStorage.getItem(storageKeys.accessToken);
  }

  function logout(): void {
    Object.values(storageKeys).forEach((k) => localStorage.removeItem(k));
  }

  return { login, exchangeCodeForTokens, getAccessToken, isAuthenticated, logout };
}

// ─── WarcraftLogs instance ──────────────────────────────────────────────────

function getWCLRedirectUri(): string {
  if (typeof window === "undefined") {
    throw new Error("Redirect URI can only be resolved in the browser.");
  }
  return `${window.location.origin}/ckreview/callback`;
}

const wclAuth = createLogAuth({
  providerLabel:  "WarcraftLogs",
  clientId:       "a22351f8-ab0e-4861-88c3-f27023c99156",
  authUrl:        "https://www.warcraftlogs.com/oauth/authorize",
  tokenUrl:       "https://www.warcraftlogs.com/oauth/token",
  scope:          "view-user-profile view-private-reports",
  getRedirectUri: getWCLRedirectUri,
  storageKeys: {
    accessToken:  "wcl_access_token",
    refreshToken: "wcl_refresh_token",
    expiresAt:    "wcl_expires_at",
    codeVerifier: "wcl_code_verifier",
  },
});

export const loginWithWarcraftLogs = wclAuth.login;
export const exchangeCodeForTokens = wclAuth.exchangeCodeForTokens;
export const getAccessToken        = wclAuth.getAccessToken;
export const isAuthenticated       = wclAuth.isAuthenticated;
export const logout                = wclAuth.logout;

// ─── FFLogs instance ────────────────────────────────────────────────────────

const FFL_REDIRECT_URI = "https://review.consistencykings.com/ckreview/ffcallback";

const fflAuth = createLogAuth({
  providerLabel:  "FFLogs",
  clientId:       "a225e605-1025-4b97-ad2f-b71347ca2e64",
  authUrl:        "https://www.fflogs.com/oauth/authorize",
  tokenUrl:       "https://www.fflogs.com/oauth/token",
  scope:          "view-user-profile view-private-reports",
  getRedirectUri: () => FFL_REDIRECT_URI,
  includeScopeInExchange: true,
  storageKeys: {
    accessToken:  "ffl_access_token",
    refreshToken: "ffl_refresh_token",
    expiresAt:    "ffl_expires_at",
    codeVerifier: "ffl_code_verifier",
  },
});

export const loginWithFFLogs        = fflAuth.login;
export const exchangeFFCodeForTokens = fflAuth.exchangeCodeForTokens;
export const getFFAccessToken       = fflAuth.getAccessToken;
export const isFFAuthenticated      = fflAuth.isAuthenticated;
export const ffLogout               = fflAuth.logout;
