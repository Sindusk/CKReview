// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { usersPool, ensureUsersSchemaOnce } from "@/lib/usersDb";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  hashPin,
  verifyPin,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureUsersSchemaOnce();

  const body = await req.json();
  const username = String(body?.username || "").trim().toLowerCase();
  const pin = String(body?.pin || "");

  if (!username || username.length > 32) {
    return NextResponse.json({ error: "Username must be 1-32 characters" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const existing = await usersPool.query(
    "SELECT id, pin_hash, role FROM app_user WHERE username = $1",
    [username],
  );

  let userId: number;
  let role: string;
  let created = false;

  if (existing.rowCount === 0) {
    // No sign-up flow: an unknown username claims the account with this PIN.
    const pinHash = await hashPin(pin);
    const inserted = await usersPool.query(
      "INSERT INTO app_user (username, pin_hash) VALUES ($1, $2) RETURNING id, role",
      [username, pinHash],
    );
    userId = inserted.rows[0].id;
    role = inserted.rows[0].role;
    created = true;
  } else {
    const ok = await verifyPin(pin, existing.rows[0].pin_hash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
    userId = existing.rows[0].id;
    role = existing.rows[0].role;
  }

  const token = await createSession(userId);
  const response = NextResponse.json({ username, role, created });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}
