// app/api/auth/signup/route.ts
//
// Username + PIN registration, separate from login so a typo'd username is
// a failed login rather than a silent second account. Ported from Stonks'
// POST /api/auth/signup: same name rules, same throttle shape. The insert
// names no role, so public signup always gets the default `user`.

import { NextRequest, NextResponse } from "next/server";
import { usersPool, ensureUsersSchemaOnce } from "@/lib/usersDb";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  credentialProblem,
  hashPin,
  rejectCrossSite,
  sessionCookieOptions,
  throttledResponse,
} from "@/lib/auth";
import { loginThrottle, requestSource } from "@/lib/login-throttle";
import { normalizeUsername, validateNewUsername } from "@/lib/usernames";

export async function POST(req: NextRequest) {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;
  await ensureUsersSchemaOnce();

  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const pin = String(body?.pin || "");

  const problem = credentialProblem(username, pin) ?? validateNewUsername(username);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const source = requestSource(req);
  // Taken before the first await — see lib/login-throttle.ts.
  const reservation = loginThrottle.reserveCreation({ username, source });
  if ("retryAfterSeconds" in reservation) return throttledResponse(reservation.retryAfterSeconds);

  try {
    const pinHash = await hashPin(pin);
    let inserted;
    try {
      inserted = await usersPool.query(
        "INSERT INTO app_user (username, pin_hash) VALUES ($1, $2) RETURNING id, role",
        [username, pinHash],
      );
    } catch (err) {
      // The unique index is the authority, not a preceding SELECT. Charged
      // to the address only: counting it against the name would let anyone
      // lock a stranger out by trying to register their username.
      if ((err as { code?: string })?.code === "23505") {
        reservation.release();
        loginThrottle.recordSourceFailure({ source });
        return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
      }
      throw err;
    }
    reservation.commit();

    const { id: userId, role } = inserted.rows[0];
    loginThrottle.recordSuccess({ username });

    const token = await createSession(userId);
    const response = NextResponse.json({ username, role }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
    return response;
  } catch (err) {
    reservation.release();
    throw err;
  }
}
