// app/api/auth/google/callback/route.ts
//
// Google's redirect back. For a "link" round trip, links the Google account
// to the session that started it; for "login", signs in or creates an
// account (never links). Returns to the page that started it with
// `?auth=<code>`. See lib/google-auth.ts.

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
  OAUTH_INTENT_COOKIE,
  OAUTH_RETURN_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  appOrigin,
  createGoogleUser,
  googleClient,
  googleConfigured,
  linkGoogle,
  linkIntent,
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
    for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_RETURN_COOKIE, OAUTH_INTENT_COOKIE]) {
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
  const intent = req.cookies.get(OAUTH_INTENT_COOKIE)?.value ?? "";
  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return finish("google-expired");
  }

  // A link goes only into the very session that started it (see
  // linkIntent): a different or missing session now means the round trip
  // no longer belongs to whoever is logged in. Checked before the code is
  // exchanged, so a mismatched round trip never touches Google.
  let linkTo: number | null = null;
  if (intent.startsWith("link:")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const current = token ? await getCurrentUser() : null;
    if (!token || !current || intent !== linkIntent(token)) return finish("google-link-mismatch");
    linkTo = current.id;
  } else if (intent !== "login") {
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

  if (linkTo != null) {
    if (linkedUserId === linkTo) return finish("google-linked");
    if (linkedUserId != null) return finish("google-in-use");
    return finish((await linkGoogle(linkTo, claims)) ? "google-linked" : "google-other-linked");
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
