// app/api/auth/login/route.ts
//
// PIN login. Matches Stonks' routes/auth.js: an unknown username is a
// failed login, never a new account (signup is app/api/auth/signup), and
// attempts are throttled. Accounts without a PIN can't log in here.

import { NextRequest, NextResponse } from "next/server";
import { usersPool, ensureUsersSchemaOnce } from "@/lib/usersDb";
import {
  LOGIN_REJECTION,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  credentialProblem,
  sessionCookieOptions,
  throttledResponse,
  verifyPin,
} from "@/lib/auth";
import { loginThrottle, requestSource } from "@/lib/login-throttle";
import { normalizeUsername } from "@/lib/usernames";

export async function POST(req: NextRequest) {
  await ensureUsersSchemaOnce();

  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const pin = String(body?.pin || "");

  const problem = credentialProblem(username, pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const source = requestSource(req);
  const verdict = loginThrottle.check({ username, source });
  if ("retryAfterSeconds" in verdict) return throttledResponse(verdict.retryAfterSeconds);

  const existing = await usersPool.query(
    "SELECT id, pin_hash, role FROM app_user WHERE username = $1",
    [username],
  );
  const row = existing.rows[0];
  if (!row || !(await verifyPin(pin, row.pin_hash))) {
    loginThrottle.recordFailure({ username, source });
    return NextResponse.json({ error: LOGIN_REJECTION }, { status: 401 });
  }
  loginThrottle.recordSuccess({ username });

  const token = await createSession(row.id);
  const response = NextResponse.json({ username, role: row.role });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}
