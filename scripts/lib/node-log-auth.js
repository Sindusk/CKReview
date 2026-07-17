// scripts/lib/node-log-auth.js
//
// Node-side replacement for lib/log-auth.ts's getAccessToken(), used to
// shim `./log-auth` when loading lib/wcl-client.ts / lib/ffl-client.ts
// under plain Node (via require-ts.js) — the browser module reads/writes
// localStorage and does a PKCE + redirect login, neither of which exist
// outside a browser. This only implements the `refresh_token` grant,
// which needs no redirect URI or browser at all — just the same public
// client_id the app already uses (see lib/log-auth.ts) plus a refresh
// token you seed ONCE.
//
// One-time setup: log into the app in your browser, then in devtools run
//   copy(localStorage.getItem("wcl_refresh_token"))     // or ffl_refresh_token
// and save the result into .credentials/wcl-token.json (or ffl-token.json)
// as { "refresh_token": "<pasted value>" }. The refresh token may rotate
// on use — this module persists the new one back to the same file, so
// only the very first seed is manual.

const fs = require('fs');
const path = require('path');

function loadCreds(credsPath, providerLabel) {
  if (!fs.existsSync(credsPath)) {
    throw new Error(
      `Missing ${providerLabel} credentials file: ${credsPath}\n` +
      `One-time setup: log into the app in your browser, open devtools, and run:\n` +
      `  copy(localStorage.getItem("${providerLabel === 'WarcraftLogs' ? 'wcl' : 'ffl'}_refresh_token"))\n` +
      `Then create ${credsPath} with: { "refresh_token": "<pasted value>" }`
    );
  }
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  if (!creds.refresh_token) {
    throw new Error(`${credsPath} is missing "refresh_token" — see the setup instructions in this file's header.`);
  }
  return creds;
}

function saveCreds(credsPath, creds) {
  fs.mkdirSync(path.dirname(credsPath), { recursive: true });
  fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2));
}

/**
 * Builds a { getAccessToken } shim for lib/log-auth.ts's named export the
 * client modules import (getAccessToken for WCL, getFFAccessToken for FFL
 * — same shape, different name at the call site, so the caller picks which
 * key to expose).
 */
function createNodeLogAuth({ providerLabel, clientId, tokenUrl, credsPath }) {
  async function refresh(creds) {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      refresh_token: creds.refresh_token,
    });

    const res = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) {
      throw new Error(`${providerLabel} token refresh failed (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    const updated = {
      refresh_token: data.refresh_token ?? creds.refresh_token, // Passport may or may not rotate it
      access_token:  data.access_token,
      expires_at:    Date.now() + data.expires_in * 1000,
    };
    saveCreds(credsPath, updated);
    return updated;
  }

  async function getAccessToken() {
    let creds = loadCreds(credsPath, providerLabel);
    const nearExpiry = !creds.access_token || Date.now() > (creds.expires_at ?? 0) - 60_000;
    if (nearExpiry) creds = await refresh(creds);
    return creds.access_token;
  }

  return { getAccessToken };
}

module.exports = { createNodeLogAuth };
