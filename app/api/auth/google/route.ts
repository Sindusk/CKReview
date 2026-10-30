// app/api/auth/google/route.ts
//
// Starts Google sign-in (or linking, when already logged in) for any
// consistencykings.com app: GET ?return_to=<page>. See lib/google-auth.ts.

import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateState } from "arctic";
import {
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  googleClient,
  googleConfigured,
  oauthCookieOptions,
  safeReturnTo,
  withAuthOutcome,
} from "@/lib/google-auth";

const ROUND_TRIP_SECONDS = 10 * 60;

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }

  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("return_to"));

  let url: URL;
  const state = generateState();
  const verifier = generateCodeVerifier();
  try {
    url = googleClient().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  } catch {
    return NextResponse.redirect(withAuthOutcome(returnTo, "google-error"));
  }
  // Always show the account chooser, so someone signed in to several
  // Google accounts can pick which one to link.
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  const opts = oauthCookieOptions(ROUND_TRIP_SECONDS);
  response.cookies.set(OAUTH_STATE_COOKIE, state, opts);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, opts);
  response.cookies.set(OAUTH_RETURN_COOKIE, returnTo, opts);
  return response;
}
