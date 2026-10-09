"use client";

// components/LogApiSetupDialog.tsx
//
// Bring-your-own API client setup for WarcraftLogs / FFLogs (see the header
// of lib/log-auth.ts for why there is no built-in client). Walks the user
// through registering a public (PKCE) client on the log site, takes its
// client ID, stores it in localStorage, and starts the OAuth login. Opened
// from the burger menu's Integrations entries, connected or not, so the ID
// can also be changed or removed here.

import { useEffect, useState } from "react";
import { Dialog, Field } from "./ui/Dialog";
import {
  getWCLClientId, setWCLClientId, getWCLRedirectUri, loginWithWarcraftLogs, isAuthenticated, logout,
  getFFClientId,  setFFClientId,  getFFRedirectUri,  loginWithFFLogs,       isFFAuthenticated, ffLogout,
} from "@/lib/log-auth";

export type LogProvider = "wcl" | "ffl";

const PROVIDERS = {
  wcl: {
    label:         "WarcraftLogs",
    clientsUrl:    "https://www.warcraftlogs.com/api/clients/",
    getClientId:   getWCLClientId,
    setClientId:   setWCLClientId,
    getRedirect:   getWCLRedirectUri,
    login:         loginWithWarcraftLogs,
    isConnected:   isAuthenticated,
    disconnect:    logout,
  },
  ffl: {
    label:         "FFLogs",
    clientsUrl:    "https://www.fflogs.com/api/clients/",
    getClientId:   getFFClientId,
    setClientId:   setFFClientId,
    getRedirect:   getFFRedirectUri,
    login:         loginWithFFLogs,
    isConnected:   isFFAuthenticated,
    disconnect:    ffLogout,
  },
} as const;

// Both sites issue client IDs as UUIDs.
const CLIENT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  provider: LogProvider | null;   // null = closed
  onClose:  () => void;
};

export default function LogApiSetupDialog({ provider, onClose }: Props) {
  const [clientId,  setClientIdInput] = useState("");
  const [connected, setConnected]     = useState(false);
  const [error,     setError]         = useState<string | null>(null);
  const [copied,    setCopied]        = useState(false);

  // Reload stored state each time the dialog opens.
  useEffect(() => {
    if (!provider) return;
    const p = PROVIDERS[provider];
    setClientIdInput(p.getClientId() ?? "");
    setConnected(p.isConnected());
    setError(null);
    setCopied(false);
  }, [provider]);

  if (!provider) return null;
  const p = PROVIDERS[provider];
  const redirectUri  = p.getRedirect();
  const storedId     = p.getClientId();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the URL and copy it manually.");
    }
  }

  async function handleConnect() {
    const id = clientId.trim();
    if (!CLIENT_ID_RE.test(id)) {
      setError("That doesn't look like a client ID. It should be a UUID like 9a1b2c3d-…, copied from the client's page.");
      return;
    }
    p.setClientId(id);
    try {
      await p.login();   // navigates away to the log site
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDisconnect() {
    p.disconnect();
    setConnected(false);
  }

  function handleRemove() {
    p.setClientId(null);
    setClientIdInput("");
    setConnected(false);
  }

  const codeStyle = {
    fontFamily: "monospace",
    fontSize:   "12px",
    padding:    "1px 5px",
    borderRadius: "3px",
    background: "rgba(255,255,255,0.08)",
  } as const;

  return (
    <Dialog
      title={`Connect ${p.label}`}
      subtitle={connected ? `Connected with your own API client.` : `Imports run on your own ${p.label} API client.`}
      width="520px"
      onClose={onClose}
      footer={
        <>
          {storedId && (
            <button className="ck-btn ck-btn--md" onClick={handleRemove} style={{ marginRight: "auto" }}>
              Remove Client
            </button>
          )}
          {connected && (
            <button className="ck-btn ck-btn--md" onClick={handleDisconnect}>Disconnect</button>
          )}
          <button className="ck-btn ck-btn--md" onClick={onClose}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleConnect}>
            {connected ? "Reconnect" : "Save & Connect"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: "13px", color: "var(--ck-text-2)", lineHeight: 1.5 }}>
        {p.label} charges API usage to whoever owns the API client, so each user brings their own.
        It takes about a minute, and you only do it once per browser.
      </p>

      <ol style={{ fontSize: "13px", lineHeight: 1.6, paddingLeft: "20px", margin: "0 0 14px" }}>
        <li>
          Open{" "}
          <a href={p.clientsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ck-text-gold)" }}>
            {p.clientsUrl.replace("https://www.", "")}
          </a>{" "}
          (log in if asked) and create a new client.
        </li>
        <li>Give it any name, e.g. <span style={codeStyle}>CK Review</span>.</li>
        <li>
          Set the redirect URL to exactly:
          <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "4px 0" }}>
            <input className="ck-input" readOnly value={redirectUri} onFocus={e => e.target.select()} style={{ flex: 1, fontFamily: "monospace", fontSize: "12px" }} />
            <button className="ck-btn ck-btn--sm" onClick={handleCopy}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </li>
        <li>Tick <b>Public Client</b>. No client secret is needed.</li>
        <li>Create it, then paste its <b>client ID</b> below.</li>
      </ol>

      <Field label="Client ID" style={{ marginBottom: error ? "10px" : "8px" }}>
        <input
          className="ck-input"
          value={clientId}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          onChange={e => { setClientIdInput(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
          style={{ fontFamily: "monospace" }}
          autoFocus={!storedId}
        />
      </Field>

      {error && <p className="ck-error-text" style={{ marginTop: 0 }}>{error}</p>}

      <p style={{ margin: 0, fontSize: "11px", color: "var(--ck-text-3)", lineHeight: 1.5 }}>
        The client ID and your login tokens are kept only in this browser. This site's server never receives them.
      </p>
    </Dialog>
  );
}
