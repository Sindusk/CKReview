// lib/google-auth.ts
//
// Google sign-in for every consistencykings.com app. This app is the only
// one that talks to Google: the other apps send the browser to
// `<this app>/api/auth/google?return_to=<their page>`, and the callback
// here sets the same parent-domain `ck_session` cookie a PIN login sets
// (lib/auth.ts). Each app keeps reading that cookie exactly as before, so
// none of them needs OAuth code of its own, and one Google client and
// redirect URI serve them all.
//
// Flow (app/api/auth/google/route.ts → Google → .../callback/route.ts):
//   - Start: random state + PKCE verifier in short-lived host-only cookies,
//     then a redirect to Google asking only for openid/email/profile.
//   - Callback, already logged in: the Google account is *linked* to the
//     current account. This is how an existing PIN account moves to Google
//     with its statics and Stonks portfolio intact — app_user.id doesn't
//     change, and every app keys its data by that id.
//   - Callback, logged out: a linked Google account signs in to its
//     account; an unknown one creates a new PIN-less account named after
//     the email (a second account if that person already had a PIN one —
//     the dialog tells them to log in and link instead).
//   - Outcome goes back to return_to as `?auth=<code>`; the page turns the
//     code into a message (see AUTH_MESSAGES in components/LoginDialog.tsx).
//
// Google's tokens are discarded after the callback reads the id token's
// claims: nothing here calls Google on the user's behalf later.
//
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (this
// app's public `/api/auth/google/callback` URL — also the source of this
// app's public origin, since behind nginx the request's own Host is
// 127.0.0.1). The redirect URI must be registered on the Google client.

import { Google } from "arctic";
import { usersPool } from "./usersDb";
import { usernameBaseFromEmail, validateNewUsername } from "./usernames";

export const GOOGLE_PROVIDER = "google";

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI,
  );
}

export function googleClient(): Google {
  return new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

/** This app's public origin, from GOOGLE_REDIRECT_URI (see header). */
export function appOrigin(): string {
  return new URL(process.env.GOOGLE_REDIRECT_URI!).origin;
}

// ── OAuth round-trip cookies ─────────────────────────────────────────────
// Host-only on this app and gone after ten minutes. SameSite=Lax still
// sends them on Google's top-level redirect back to the callback.

export const OAUTH_STATE_COOKIE    = "ck_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "ck_oauth_verifier";
export const OAUTH_RETURN_COOKIE   = "ck_oauth_return";

export function oauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path:     "/api/auth/google",
    maxAge:   maxAgeSeconds,
    secure:   appOrigin().startsWith("https:"),
  };
}

/**
 * Where to send the browser afterwards. Only pages on this app, on the
 * shared cookie domain (any consistencykings.com app, https), or — in local
 * dev, where COOKIE_DOMAIN is unset — on localhost. Anything else falls
 * back to this app's front page, so the endpoint can't be used as an open
 * redirect.
 */
export function safeReturnTo(raw: string | null): string {
  const origin = appOrigin();
  const fallback = `${origin}/`;
  if (!raw) return fallback;

  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }

  if (url.origin === origin) return url.toString();

  const domain = process.env.COOKIE_DOMAIN?.replace(/^\./, "");
  if (domain) {
    const onDomain = url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    return onDomain && url.protocol === "https:" ? url.toString() : fallback;
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return local && url.protocol === "http:" ? url.toString() : fallback;
}

/** return_to with `auth=<code>` added — the outcome the page reports. */
export function withAuthOutcome(returnTo: string, code: string): string {
  const url = new URL(returnTo);
  url.searchParams.set("auth", code);
  return url.toString();
}

// ── Identities ───────────────────────────────────────────────────────────

export type GoogleClaims = {
  sub:             string;
  email?:          string;
  email_verified?: boolean;
};

/** The account a Google account is linked to, if any. */
export async function userIdForGoogle(sub: string): Promise<number | null> {
  const result = await usersPool.query(
    "SELECT user_id FROM auth_identity WHERE provider = $1 AND provider_user_id = $2",
    [GOOGLE_PROVIDER, sub],
  );
  return result.rows[0]?.user_id ?? null;
}

/** The Google email linked to an account, or null. */
export async function googleEmailForUser(userId: number): Promise<string | null> {
  const result = await usersPool.query(
    "SELECT email FROM auth_identity WHERE provider = $1 AND user_id = $2",
    [GOOGLE_PROVIDER, userId],
  );
  return result.rowCount ? (result.rows[0].email ?? "") : null;
}

/** Keeps the stored email current — Google accounts can change address. */
export async function refreshGoogleEmail(sub: string, email: string | null): Promise<void> {
  await usersPool.query(
    "UPDATE auth_identity SET email = $3 WHERE provider = $1 AND provider_user_id = $2",
    [GOOGLE_PROVIDER, sub, email],
  );
}

/**
 * Links a Google account to an account. Returns false when the account
 * already has a different Google account linked (UNIQUE (user_id,
 * provider)); the caller has already ruled out the Google account being
 * linked elsewhere, and a race there also lands on the unique index.
 */
export async function linkGoogle(userId: number, claims: GoogleClaims): Promise<boolean> {
  try {
    await usersPool.query(
      `INSERT INTO auth_identity (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [userId, GOOGLE_PROVIDER, claims.sub, claims.email ?? null],
    );
    return true;
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") return false;
    throw err;
  }
}

/**
 * Creates a PIN-less account for a Google account nobody has linked, named
 * after the email's local part, with 2, 3, … appended until the name is
 * free and not reserved. Account row and identity row go in together.
 */
export async function createGoogleUser(claims: GoogleClaims): Promise<number> {
  const base = usernameBaseFromEmail(claims.email ?? null);
  const client = await usersPool.connect();
  try {
    for (let n = 1; n < 1000; n++) {
      const username = n === 1 ? base : `${base}${n}`;
      if (validateNewUsername(username)) continue;

      await client.query("BEGIN");
      try {
        const inserted = await client.query(
          "INSERT INTO app_user (username, pin_hash) VALUES ($1, NULL) RETURNING id",
          [username],
        );
        const userId: number = inserted.rows[0].id;
        await client.query(
          `INSERT INTO auth_identity (user_id, provider, provider_user_id, email)
           VALUES ($1, $2, $3, $4)`,
          [userId, GOOGLE_PROVIDER, claims.sub, claims.email ?? null],
        );
        await client.query("COMMIT");
        return userId;
      } catch (err) {
        await client.query("ROLLBACK");
        // 23505 on app_user.username → try the next name. On the identity
        // (the same Google account finishing sign-in twice at once) the
        // other request won; let the caller's lookup find its account.
        if ((err as { code?: string; constraint?: string })?.code === "23505") {
          const existing = await userIdForGoogle(claims.sub);
          if (existing != null) return existing;
          continue;
        }
        throw err;
      }
    }
    throw new Error(`No free username for base "${base}"`);
  } finally {
    client.release();
  }
}
