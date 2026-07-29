// app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, deleteSession, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  // Clear must match the attributes the cookie was set with (domain in
  // particular), so reuse sessionCookieOptions with maxAge 0.
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
