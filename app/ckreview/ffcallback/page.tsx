"use client";

// app/ckreview/ffcallback/page.tsx
//
// FFLogs OAuth callback.
// FFLogs redirects here after the user approves access:
//   http://consistencykings/ckreview/ffcallback?code=AUTH_CODE
//
// This page:
//   1. Reads `code` from the query string
//   2. Exchanges it for tokens via PKCE (exchangeFFCodeForTokens)
//   3. Redirects to / on success, or shows an error on failure

import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import { exchangeFFCodeForTokens } from "@/lib/ffl-auth";

type Status = "exchanging" | "success" | "error";

export default function FFLogsCallbackPage() {
  const router = useRouter();
  const [status,  setStatus]  = useState<Status>("exchanging");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    const error  = params.get("error");

    if (error) {
      setStatus("error");
      setMessage(`FFLogs denied access: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code found in the callback URL.");
      return;
    }

    exchangeFFCodeForTokens(code)
      .then(() => {
        setStatus("success");
        // Brief pause so the user sees confirmation, then go home
        setTimeout(() => router.replace("/"), 1200);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : String(err));
      });
  }, [router]);

  return (
    <div
      style={{
        height:          "100vh",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        backgroundColor: "#0a0a0a",
        color:           "white",
        gap:             "16px",
        fontFamily:      "Arial, Helvetica, sans-serif",
      }}
    >
      {status === "exchanging" && (
        <>
          <Spinner />
          <p style={{ color: "#888", fontSize: "14px" }}>
            Connecting to FFLogs…
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <span style={{ fontSize: "36px" }}>✅</span>
          <p style={{ color: "#4ade80", fontSize: "16px", fontWeight: 600 }}>
            Connected to FFLogs
          </p>
          <p style={{ color: "#555", fontSize: "13px" }}>Redirecting…</p>
        </>
      )}

      {status === "error" && (
        <>
          <span style={{ fontSize: "36px" }}>❌</span>
          <p style={{ color: "#f87171", fontSize: "16px", fontWeight: 600 }}>
            Authentication failed
          </p>
          <p
            style={{
              color:     "#888",
              fontSize:  "13px",
              maxWidth:  "480px",
              textAlign: "center",
            }}
          >
            {message}
          </p>
          <button
            onClick={() => router.replace("/")}
            style={{
              marginTop:       "8px",
              padding:         "8px 20px",
              backgroundColor: "#7c3aed",
              color:           "white",
              border:          "none",
              borderRadius:    "6px",
              cursor:          "pointer",
              fontWeight:      600,
            }}
          >
            Back to CK Review
          </button>
        </>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width:        "36px",
        height:       "36px",
        border:       "3px solid #333",
        borderTop:    "3px solid #7c3aed",
        borderRadius: "50%",
        animation:    "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
