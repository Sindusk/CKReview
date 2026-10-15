// lib/xivapi-tooltips.ts
//
// In-game descriptions for FFXIV actions and statuses, from XIVAPI v2
// (v2.xivapi.com, CORS-open), for the ability hover tooltips. Fetched
// lazily on the first hover of each ability, never on navigation, and
// cached in memory and localStorage (7 days, so a patch's tooltip
// changes come through).
//
// FFLogs ids: an action's abilityGameID is its Action row id; a status
// (buff, debuff, DoT tick) is 1,000,000 + its Status row id. An action's
// description lives on the ActionTransient sheet, which v2 joins in via
// `transient=Description`. A row whose name doesn't match the log's is
// dropped, so an id from another sheet (items, pets) shows nothing
// rather than the wrong text.

export type XivTooltip = { description: string } | null;

const API = "https://v2.xivapi.com/api/sheet";
const STATUS_OFFSET = 1_000_000;
const TTL_MS = 7 * 24 * 3600 * 1000;
const memory = new Map<string, Promise<XivTooltip>>();

function urlOf(id: number): { key: string; url: string } {
  if (id >= STATUS_OFFSET) {
    const row = id - STATUS_OFFSET;
    return { key: `Status/${row}`, url: `${API}/Status/${row}?fields=Name,Description` };
  }
  return { key: `Action/${id}`, url: `${API}/Action/${id}?fields=Name&transient=Description` };
}

function readStore(key: string): XivTooltip | undefined {
  try {
    const raw = localStorage.getItem(`xivapi:${key}`);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as { at: number; tip: XivTooltip };
    return Date.now() - v.at < TTL_MS ? v.tip : undefined;
  } catch { return undefined; }
}
function writeStore(key: string, tip: XivTooltip) {
  try { localStorage.setItem(`xivapi:${key}`, JSON.stringify({ at: Date.now(), tip })); } catch { /* private window */ }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The ability's in-game description, or null when XIVAPI has none for it. */
export function fetchXivTooltip(id: number, name: string): Promise<XivTooltip> {
  const { key, url } = urlOf(id);
  const hit = memory.get(key);
  if (hit) return hit;
  const stored = readStore(key);
  if (stored !== undefined) {
    const p = Promise.resolve(stored);
    memory.set(key, p);
    return p;
  }
  const p = fetch(url)
    .then(async (r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`XIVAPI ${r.status}`);
      const j = await r.json() as { fields?: { Name?: string; Description?: string }; transient?: { Description?: string } };
      const desc = (j.transient?.Description ?? j.fields?.Description ?? "").trim();
      if (!desc || norm(j.fields?.Name ?? "") !== norm(name)) return null;
      return { description: desc };
    })
    .then((tip) => { writeStore(key, tip); return tip; })
    .catch(() => { memory.delete(key); return null; });  // network error: retry on a later hover
  memory.set(key, p);
  return p;
}
