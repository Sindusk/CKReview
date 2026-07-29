// lib/auth.ts
//
// Shared-account auth for consistencykings.com apps. Ported from Stonks'
// lib/auth.js — the crypto/session logic is unchanged (pure node:crypto +
// SQL against lib/usersDb.ts, no framework coupling), but cookie I/O is
// adapted to Next.js App Router: reading uses next/headers `cookies()`
// instead of manual Cookie-header parsing, and writing uses the
// NextResponse cookie API instead of Express's res.cookie() (note maxAge
// is in *seconds* here, not ms like the `cookie` package Stonks uses).
//
// Security is deliberately light — a 4-digit PIN for a small trusted
// group — but the PIN is still scrypt-hashed and sessions are random
// opaque tokens, so nothing sensitive sits in the database in plaintext.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { usersPool, ensureUsersSchemaOnce } from "./usersDb";

const SCRYPT_KEYLEN = 32;

export type SessionUser = {
  id:       number;
  username: string;
  role:     string;
};

function scryptAsync(pin: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pin, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(pin, salt);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  const [salt, keyHex] = pinHash.split(":");
  if (!salt || !keyHex) return false;
  const key = await scryptAsync(pin, salt);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await usersPool.query("INSERT INTO session (token, user_id) VALUES ($1, $2)", [token, userId]);
  return token;
}

export async function getSessionUser(token: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const result = await usersPool.query(
    `UPDATE session SET last_seen_at = now()
     FROM app_user
     WHERE session.token = $1 AND app_user.id = session.user_id
     RETURNING app_user.id, app_user.username, app_user.role`,
    [token],
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(token: string | null): Promise<void> {
  if (!token) return;
  await usersPool.query("DELETE FROM session WHERE token = $1", [token]);
}

export const SESSION_COOKIE = "ck_session";

// In production the cookie is set on the parent domain so the same login is
// visible to every consistencykings.com subdomain app. Locally COOKIE_DOMAIN
// is unset → host-only cookie on localhost, and Secure is dropped since
// local dev is plain http.
export function sessionCookieOptions(maxAgeSeconds: number) {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   maxAgeSeconds,
    ...(domain ? { domain, secure: true } : {}),
  };
}

export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// Reads the session cookie via next/headers and resolves the logged-in
// user, if any. Usable from Server Components and Route Handlers — the
// single chokepoint every Statics route handler uses to answer "who is
// this request from".
export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureUsersSchemaOnce();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  return getSessionUser(token);
}
