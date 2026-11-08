"use client";

// hooks/useUserWaymarks.ts
//
// The signed-in user's imported waymark presets and Auto default for one
// fight's replay (app/api/waymarks). Loads when the fight changes; our own
// database, not a log API, so no fetch budget to watch. Signed out, there
// are no presets and every write fails with the server's message.

import { useCallback, useEffect, useState } from "react";
import type { Waymark } from "@/lib/replay/waymarks";

export type UserWaymarkPreset = { name: string; marks: Waymark[]; mapId: number | null };

export function useUserWaymarks(fightKey: string | null) {
  const [signedIn, setSignedIn] = useState(false);
  const [presets, setPresets] = useState<UserWaymarkPreset[]>([]);
  const [defaultChoice, setDefaultChoice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!fightKey) { setPresets([]); setDefaultChoice(null); return; }
    const d = await fetch(`/api/waymarks?fight=${encodeURIComponent(fightKey)}`).then((r) => r.json()).catch(() => null);
    setSignedIn(!!d?.signedIn);
    setPresets(Array.isArray(d?.presets) ? d.presets : []);
    setDefaultChoice(typeof d?.defaultChoice === "string" ? d.defaultChoice : null);
  }, [fightKey]);
  useEffect(() => { reload(); }, [reload]);

  /** Sends a write; resolves to the server's error text, or null when it worked. */
  const send = useCallback(async (method: string, url: string, body?: object): Promise<string | null> => {
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return d.error || "Request failed";
      await reload();
      return null;
    } catch {
      return "Request failed. Check your connection and try again.";
    }
  }, [reload]);

  const savePreset = useCallback((p: UserWaymarkPreset) =>
    send("POST", "/api/waymarks", { fight: fightKey, name: p.name, marks: p.marks, mapId: p.mapId }), [send, fightKey]);
  const deletePreset = useCallback((name: string) =>
    send("DELETE", `/api/waymarks?fight=${encodeURIComponent(fightKey ?? "")}&name=${encodeURIComponent(name)}`), [send, fightKey]);
  const setDefault = useCallback((choice: string | null) =>
    send("PUT", "/api/waymarks", { fight: fightKey, choice }), [send, fightKey]);

  return { signedIn, presets, defaultChoice, savePreset, deletePreset, setDefault };
}
