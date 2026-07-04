// lib/session-client.ts
//
// Client-side fetch wrappers around the /api/sessions routes.

import type { SavedSession } from "@/types/Session";

export type SessionLookupMatch = {
  id:        string;
  createdAt: number;
  vodCount:  number;
  wipeCount: number;
};

export async function lookupSessionForLog(
  source: "wcl" | "ffl",
  code:   string
): Promise<SessionLookupMatch | null> {
  try {
    const res = await fetch(`/api/sessions/lookup?source=${source}&code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.match ?? null;
  } catch {
    return null;
  }
}

export async function fetchSession(id: string): Promise<SavedSession | null> {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.session as SavedSession;
  } catch {
    return null;
  }
}

export async function createSession(session: Omit<SavedSession, "createdAt">): Promise<string> {
  const res = await fetch(`/api/sessions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(session),
  });
  const data = await res.json();
  return data.id as string;
}

export async function updateSession(id: string, session: Omit<SavedSession, "createdAt">): Promise<void> {
  await fetch(`/api/sessions/${id}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(session),
  });
}