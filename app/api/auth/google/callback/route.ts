// app/api/auth/google/callback/route.ts
//
// Google's redirect back. Links the Google account to the logged-in
// account, or signs in / creates an account when logged out, then returns
// to the page that started it with `?auth=<code>`. See lib/google-auth.ts.

import { NextRequest, NextResponse } from "next/server";
import { decodeIdToken } from "arctic";
import { ensureUsersSchemaOnce } from "@/lib/usersDb";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  getCurrentUser,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  GoogleClaims,
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  appOrigin,
  createGoogleUser,
  googleClient,
  googleConfigured,
  linkGoogle,
  oauthCookieOptions,
  refreshGoogleEmail,
  safeReturnTo,
  userIdForGoogle,
  withAuthOutcome,
} from "@/lib/google-auth";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 503 });
  }
  await ensureUsersSchemaOnce();

  const returnTo = safeReturnTo(req.cookies.get(OAUTH_RETURN_COOKIE)?.value ?? `${appOrigin()}/`);
  const finish = (code: string, sessionToken?: string) => {
    const response = NextResponse.redirect(withAuthOutcome(returnTo, code));
    for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_RETURN_COOKIE]) {
      response.cookies.set(name, "", oauthCookieOptions(0));
    }
    if (sessionToken) {
      response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
    }
    return response;
  };

  const params = req.nextUrl.searchParams;
  // The user pressed Cancel on Google's screen.
  if (params.get("error")) return finish("google-cancelled");

  const code = params.get("code");
  const state = params.get("state");
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return finish("google-expired");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code, verifier);
    // Read straight from Google's token endpoint over TLS, so the id
    // token's signature needn't be checked separately (OIDC Core 3.1.3.7).
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return finish("google-error");
  }
  if (!claims.sub || !claims.email_verified) return finish("google-unverified");

  const linkedUserId = await userIdForGoogle(claims.sub);
  const current = await getCurrentUser();

  if (current) {
    if (linkedUserId === current.id) return finish("google-linked");
    if (linkedUserId != null) return finish("google-in-use");
    return finish((await linkGoogle(current.id, claims)) ? "google-linked" : "google-other-linked");
  }

  let userId = linkedUserId;
  let outcome = "google-signed-in";
  if (userId == null) {
    userId = await createGoogleUser(claims);
    outcome = "google-created";
  } else {
    await refreshGoogleEmail(claims.sub, claims.email ?? null);
  }
  return finish(outcome, await createSession(userId));
}
