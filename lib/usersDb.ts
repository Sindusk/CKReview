// lib/usersDb.ts
//
// Connection to the shared `users` database — a separate database from
// this app's own (see lib/prisma.ts), shared by every consistencykings.com
// app so one account/session works across all of them. Deliberately plain
// `pg` (no Prisma): no single app should own migrations for a shared
// schema, so the tables are created idempotently on first use instead.
// Ported from Stonks' lib/usersDb.js. This copy is ahead of Stonks': it adds
// the Google sign-in schema (nullable pin_hash, auth_identity), because this
// app hosts Google sign-in for every consistencykings.com app. Copy this
// version, not Stonks', into any new app.

import pg from "pg";

export const usersPool = new pg.Pool({
  connectionString: process.env.USERS_DATABASE_URL,
});

/**
 * Runs `fn` in a transaction holding a row lock on the account, and passes
 * it the account's pin_hash. Every change that removes a sign-in method
 * (PIN off, Google unlink) goes through this, so two of them can't each
 * check that the other method still exists and then both succeed, leaving
 * the account with no way in. `fn` throwing rolls everything back.
 */
export async function withAccountLocked<T>(
  userId: number,
  fn: (client: pg.PoolClient, pinHash: string | null) => Promise<T>,
): Promise<T> {
  const client = await usersPool.connect();
  try {
    await client.query("BEGIN");
    const row = await client.query("SELECT pin_hash FROM app_user WHERE id = $1 FOR UPDATE", [userId]);
    const result = await fn(client, row.rows[0]?.pin_hash ?? null);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

let schemaReady: Promise<void> | null = null;

// Next.js route handlers have no single "startup" hook the way an Express
// server does, so this runs lazily on first use instead — memoized so the
// CREATE TABLE IF NOT EXISTS statements only actually execute once per
// server process, not once per request.
export function ensureUsersSchemaOnce(): Promise<void> {
  if (!schemaReady) {
    schemaReady = usersPool.query(`
      CREATE TABLE IF NOT EXISTS app_user (
          id         SERIAL PRIMARY KEY,
          username   TEXT UNIQUE NOT NULL,
          pin_hash   TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS session (
          token        TEXT PRIMARY KEY,
          user_id      INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

      DO $$
      BEGIN
          ALTER TABLE app_user ADD CONSTRAINT app_user_role_check
              CHECK (role IN ('user', 'moderator', 'administrator'));
      EXCEPTION
          WHEN duplicate_object THEN NULL;
      END $$;

      -- Google sign-in (lib/google-auth.ts). A Google-only account has no
      -- PIN, and an account may turn its PIN off once Google is linked, so
      -- pin_hash is nullable. Stonks' copy of this file still says NOT NULL
      -- in its CREATE TABLE, which is harmless: the table already exists.
      ALTER TABLE app_user ALTER COLUMN pin_hash DROP NOT NULL;

      -- One row per external sign-in linked to an account. provider_user_id
      -- is the provider's stable id (Google's "sub"), never the email, which
      -- can change. Provider-agnostic so Steam can join later.
      CREATE TABLE IF NOT EXISTS auth_identity (
          id               SERIAL PRIMARY KEY,
          user_id          INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
          provider         TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          email            TEXT,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (provider, provider_user_id),
          UNIQUE (user_id, provider)
      );
    `).then(() => undefined);
  }
  return schemaReady;
}
