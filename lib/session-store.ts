// lib/session-store.ts
//
// Minimal file-backed session store. One JSON file per session under
// data/sessions/<id>.json, at the project root. Server-only — never
// import this from a "use client" file.

import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { SavedSession } from "@/types/Session";

const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

async function ensureDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

// Guards against path traversal via a malformed/malicious id.
function sessionPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid session id: ${id}`);
  }
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export function generateSessionId(): string {
  // 8 URL-safe characters — short enough to look nice in a link, random
  // enough that guessing another session's id isn't practical for a tool
  // used by a small trusted group.
  return randomBytes(6).toString("base64url");
}

export async function readSession(id: string): Promise<SavedSession | null> {
  try {
    const raw = await fs.readFile(sessionPath(id), "utf-8");
    return JSON.parse(raw) as SavedSession;
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

export async function writeSession(id: string, session: SavedSession): Promise<void> {
  await ensureDir();
  await fs.writeFile(sessionPath(id), JSON.stringify(session, null, 2), "utf-8");
}

/**
 * Reads every saved session. Only used by the duplicate-log lookup route —
 * fine to do a full scan given the expected number of sessions for a small
 * group's use of this tool; no need for an index file.
 */
export async function listSessions(): Promise<Array<{ id: string; session: SavedSession }>> {
  await ensureDir();

  const files = await fs.readdir(SESSIONS_DIR);
  const results: Array<{ id: string; session: SavedSession }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -".json".length);

    try {
      const raw = await fs.readFile(path.join(SESSIONS_DIR, file), "utf-8");
      results.push({ id, session: JSON.parse(raw) as SavedSession });
    } catch {
      // Skip unreadable/corrupt files rather than failing the whole scan.
    }
  }

  return results;
}