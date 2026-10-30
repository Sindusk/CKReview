# Shared accounts and Google sign-in (consistencykings.com)

How the one account that works across every consistencykings.com app is
built, and how a new app (PolarityFracture is next) plugs into it. Built
2026-10-29 in CKReview and Stonks. The code is the source of truth; file
headers carry the detail, and this page is the map.

Sites (from `PORTS.md`): CKReview at `review.consistencykings.com` (port 3000),
Stonks at `stonks.consistencykings.com` (3001), Polarity at
`polarity.consistencykings.com` (3003). They all run on one host behind nginx,
and every nginx site forwards the public `Host` and `X-Real-IP`.

## The model in one paragraph

All apps share one Postgres database, `users` (env `USERS_DATABASE_URL`),
and one login cookie, `ck_session`, set on the parent domain
`consistencykings.com` (env `COOKIE_DOMAIN`). The cookie holds a random
session token, and the token names an `app_user`. Each app keeps its own data
in its own database, keyed by `app_user.id` with no cross-database foreign key:
CKReview's `StaticMember.userId`, Stonks' `Portfolio*.userId`. People sign in
with a username and 4-digit PIN, or with Google. **Google sign-in lives only in
CKReview.** Every other app sends the browser there and gets the same
`ck_session` cookie back. Linking Google to an existing account never changes
`app_user.id`, so an account's data follows it.

## Shared users database

Tables are created idempotently on first use; no app owns migrations for
them. The SQL lives in CKReview's [lib/usersDb.ts](../lib/usersDb.ts) and in
Stonks' `lib/usersDb.js`, **kept identical**. Copy CKReview's version into a
new app.

| Table | Columns that matter |
|---|---|
| `app_user` | `id`, `username` (unique, lowercased), `pin_hash` (scrypt `salt:key`, **nullable**: NULL = no PIN), `role` (`user` < `moderator` < `administrator`, promoted by hand in the database) |
| `session` | `token` (PK, 32 random bytes as hex), `user_id`, `created_at`, `last_seen_at` |
| `auth_identity` | `user_id`, `provider` (`'google'`; Steam later), `provider_user_id` (Google's stable `sub`, never the email), `email`. Unique on `(provider, provider_user_id)` and on `(user_id, provider)` |

**Resolving a request to a user** is one query. CKReview's `getSessionUser`
in [lib/auth.ts](../lib/auth.ts) runs it and bumps `last_seen_at`:

```sql
UPDATE session SET last_seen_at = now() FROM app_user
WHERE session.token = $1 AND app_user.id = session.user_id
RETURNING app_user.id, app_user.username, app_user.role
```

**Cookie attributes:** `ck_session=<token>; Domain=<COOKIE_DOMAIN>; Path=/;
HttpOnly; Secure; SameSite=Lax; Max-Age=1 year`.
- Domain and Secure are set only when `COOKIE_DOMAIN` is set.
- Locally, leave it unset: the cookie is then host-only on `localhost`, which
  browsers share across ports, so CKReview on :3000 and other apps on their own
  ports see the same login.
- Logout deletes the session row, which logs the browser out of every app at
  once.

## Google sign-in, hosted by CKReview

Code: [lib/google-auth.ts](../lib/google-auth.ts) (the header is the full
design), `app/api/auth/google/route.ts` and `.../callback/route.ts`. The
library is Arctic, and only the scopes `openid email profile` are requested.

**Starting it from any app** is a full-page navigation, never a fetch:

```
https://review.consistencykings.com/api/auth/google?intent=login&return_to=<absolute URL in your app>
https://review.consistencykings.com/api/auth/google?intent=link&return_to=<...>
```

- **`intent=login`** signs in to the account a Google account is linked to.
  If the Google account isn't linked yet, it creates a new account with no PIN,
  named after the email. It never links.
- **`intent=link`** needs a logged-in `ck_session` when it starts, and links
  Google into that exact session's account. If the session changed by the time
  Google returns, nothing is linked (`google-link-mismatch`). This is how an
  existing PIN account moves to Google and keeps its data.
- **`return_to`** must be on this app, or `https://` on the cookie domain.
  Locally it must be `http://localhost` or `127.0.0.1`. Anything else falls back
  to CKReview's front page, so the endpoint can't be used as an open redirect.
- The browser comes back to `return_to` with **`?auth=<code>`**. Show a message
  for it and strip it from the address bar. The session itself arrives as the
  cookie.

| `auth` code | Meaning |
|---|---|
| `google-signed-in` | Signed in (no message needed) |
| `google-created` | Signed in as a **new** account. Tell PIN users to log in with the PIN and use Link Google instead |
| `google-linked` | Google is now linked to the logged-in account |
| `google-cancelled` | The user pressed Cancel at Google |
| `google-expired` | The round trip was too old or started in another tab |
| `google-error` | The code exchange with Google failed |
| `google-unverified` | The Google email isn't verified |
| `google-in-use` | That Google account is linked to a different account |
| `google-other-linked` | This account already has a different Google account linked |
| `google-link-mismatch` | The session changed during a link, so nothing was linked |
| `google-login-required` | A link was started while logged out |

CKReview's `AUTH_MESSAGES` in `components/LoginDialog.tsx` has the message
text. Stonks keeps a copy in `frontend/src/api.ts`.

**Google Cloud.** There is one OAuth "Web application" client for all apps,
in the Google Cloud project whose credentials PolarityFracture's
`google-auth-setup-guide.md` describes. It is published ("In production"),
and the app name is "Consistency Kings".
- Authorized redirect URIs are CKReview's `/api/auth/google/callback`, in
  production and on `http://localhost:3000`.
- The Branding page lists `consistencykings.com` as an authorized domain and
  links CKReview's [/privacy](../app/privacy/page.tsx) and
  [/terms](../app/terms/page.tsx), which cover every app on the shared account.
- **Other apps need no Google configuration and no redirect URI of their
  own.**

CKReview's env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`GOOGLE_REDIRECT_URI`. The redirect URI must match the registered one, and it
also gives CKReview its public origin. Values live only in gitignored `.env`
files.

## Managing sign-in methods

CKReview's menu → **Sign-in methods** ([components/AccountDialog.tsx](../components/AccountDialog.tsx)):
- link or unlink Google (unlinking needs a PIN);
- turn the PIN off (needs Google linked) or set one while there is none.

Endpoints: `POST /api/auth/pin` (`{action: "disable"}` or
`{action: "set", pin}`) and `POST /api/auth/google/unlink`.

Other apps open the panel with `https://review.consistencykings.com/?panel=sign-in-methods`.
Stonks plans its own copy: `docs/agent-notes/sign-in-methods-proposal.md` in
its repository.

## Security properties

Keep these in any app that adds auth endpoints. Two reviews (Sol, 2026-10-29)
found the gaps that the first four close.

- **Cross-site requests are refused** on every state-changing auth POST:
  login, signup, PIN changes and unlink. The request must be JSON, and its
  `Origin` (when sent) must match the request's `Host` or the app's configured
  public origin. Without this, another site could log a visitor into an account
  of its choosing (login CSRF), and a later Google sign-in could then attach the
  visitor's Google to it. See `rejectCrossSite` in [lib/auth.ts](../lib/auth.ts)
  and in Stonks' `lib/auth.js`.
- **Google round trips carry their intent from the start** (`login` or
  `link`, the latter bound to a hash of the starting session token) in a
  short-lived, host-only, HttpOnly cookie, together with the OAuth state and
  PKCE verifier.
- **PIN guessing is throttled** per username and per source address (the
  address comes from `X-Real-IP`). Each attempt counts **before** the slow
  scrypt check, so parallel guesses can't all pass the limit. See
  [lib/login-throttle.ts](../lib/login-throttle.ts) and Stonks'
  `lib/loginThrottle.js`. Counters are in-memory and kept per app.
- **Removing a sign-in method** (PIN off, unlink) runs under a row lock on
  the account (`withAccountLocked` in [lib/usersDb.ts](../lib/usersDb.ts)), so
  two concurrent removals can't leave an account with no way in.
- Login gives the same message ("Incorrect username or PIN") for an unknown
  username, a wrong PIN and an account with no PIN, so it can't be used to
  enumerate accounts. Signup is separate from login, refuses reserved names
  (`lib/usernames.ts`), and has a per-address creation budget.
- Google tokens are thrown away after the callback reads the ID token. The ID
  token comes straight from Google's token endpoint over TLS, so it isn't
  separately signature-checked (OIDC Core 3.1.3.7).

## Adding an app (PolarityFracture)

Polarity today has its own login: a dev-login stub, a signed `pf_session`
cookie holding a `Player.id` (uuid), and no server-side session table
(`apps/server/src/session.ts`). Its `google-auth-setup-guide.md` planned
per-app Google OAuth with its own `AuthIdentity` table. This shared design
**replaces that plan**: Polarity doesn't talk to Google, and its registered
`/auth/google/callback` redirect URI has already been removed.

To join the shared account:

1. **Read the shared session.** Point `USERS_DATABASE_URL` at the `users`
   database (Polarity's `.env` already names it). Set `COOKIE_DOMAIN` in
   production, and leave it unset locally. On each request and on Socket.IO
   connect, read `ck_session` from the Cookie header and resolve it with the
   query above. The parent-domain cookie reaches `polarity.` automatically,
   and SameSite=Lax holds for same-site requests.
2. **Map accounts to players.** Add a nullable, unique `usersUserId Int` on
   `Player`. The first time an `app_user` arrives with no Player, create one,
   or offer to claim an existing dev-login Player. **That choice is the owner's
   to make.**
3. **Choose how sessions work. Ask the owner.** Either:
   - make `ck_session` the session (drop `pf_session`), so logout anywhere on
     the domain logs out of Polarity; or
   - keep `pf_session` as a cache that `establishSession` sets from a valid
     `ck_session`. Then re-check `ck_session` often enough that logging out
     elsewhere takes effect.
4. **Login UI.** Use `<a href>` to CKReview's `/api/auth/google?intent=login&return_to=<polarity page>`,
   and add Link Google for logged-in users. Handle `?auth=` on return. PIN
   login and signup, if Polarity wants them, follow Stonks' `routes/auth.js` and
   need the protections above.
5. **Don't create the shared tables differently.** If Polarity needs a schema
   change in `users`, it must land identically in CKReview's and Stonks'
   `usersDb` files.

Polarity's API is mounted under `/api` behind nginx, and its client is
static. Its existing CORS with credentials is unaffected, because the cookie
is on the parent domain.

## Where things live

| Piece | CKReview | Stonks |
|---|---|---|
| Schema + DB access | `lib/usersDb.ts` | `lib/usersDb.js` |
| Sessions, PIN hashing, cross-site check | `lib/auth.ts` | `lib/auth.js` |
| Username rules | `lib/usernames.ts` | `lib/usernames.js` |
| Throttle | `lib/login-throttle.ts` | `lib/loginThrottle.js` |
| Auth routes | `app/api/auth/*` (login, signup, me, logout, pin, google, google/callback, google/unlink) | `routes/auth.js` (signup, login, me, logout, logout-all) |
| Google | `lib/google-auth.ts` | links to CKReview (`googleStartUrl` in `frontend/src/api.ts`) |
| UI | `components/LoginDialog.tsx`, `components/AccountDialog.tsx` | `frontend/src/LoginDialog.tsx`, `BurgerMenu.tsx` |
| Tests | — | `tests/auth.test.js`, `tests/integration/auth.test.js` (scratch databases) |
