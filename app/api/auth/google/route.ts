// app/api/auth/google/route.ts
//
// Starts Google sign-in or linking for any consistencykings.com app:
// GET ?intent=login|link&return_to=<page>. Linking needs a logged-in
// session and is bound to it (linkIntent). See lib/google-auth.ts.

import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateState } from "arctic";
import { SESSION_COOKIE, getCurrentUser } from "@/lib/auth";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  googleClient,
  googleConfigured,
  linkIntent,
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

  let intent = "login";
  if (req.nextUrl.searchParams.get("intent") === "link") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token || !(await getCurrentUser())) {
      return NextResponse.redirect(withAuthOutcome(returnTo, "google-login-required"));
    }
    intent = linkIntent(token);
  }

  let url: URL;
  const state = generateState();
  const verifier = generateCodeVerifier();
  try {
    url = googleClient().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  } catch {
    return NextResponse.redirect(withAuthOutcome(returnTo, "google-error"));
  }
  // Always show the account chooser, so someone signed in to several
  // Google accounts can pick which one to use.
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  const opts = oauthCookieOptions(ROUND_TRIP_SECONDS);
  response.cookies.set(OAUTH_STATE_COOKIE, state, opts);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, opts);
  response.cookies.set(OAUTH_RETURN_COOKIE, returnTo, opts);
  response.cookies.set(OAUTH_INTENT_COOKIE, intent, opts);
  return response;
}
