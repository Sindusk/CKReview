// lib/usersDb.ts
//
// Connection to the shared `users` database — a separate database from
// this app's own (see lib/prisma.ts), shared by every consistencykings.com
// app so one account/session works across all of them. Deliberately plain
// `pg` (no Prisma): no single app should own migrations for a shared
// schema, so the tables are created idempotently on first use instead.
// Ported from Stonks' lib/usersDb.js — keep the SQL identical if this file
// is ever copied to another consistencykings.com app.

import pg from "pg";

export const usersPool = new pg.Pool({
  connectionString: process.env.USERS_DATABASE_URL,
});

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
    `).then(() => undefined);
  }
  return schemaReady;
}
