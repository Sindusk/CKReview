// lib/xivapi-tooltips.ts
//
// In-game tooltip data for FFXIV actions and statuses, from XIVAPI v2
// (v2.xivapi.com, CORS-open), for the ability hover tooltips. Fetched
// lazily on the first hover of each ability, never on navigation, and
// cached in memory and localStorage (7 days, so a patch's tooltip
// changes come through).
//
// FFLogs ids: an action's abilityGameID is its Action row id; a status
// (buff, debuff, DoT tick) is 1,000,000 + its Status row id. An action's
// description lives on the ActionTransient sheet, which v2 joins in via
// `transient=`. A row whose name doesn't match the log's is dropped, so
// an id from another sheet (items, pets) shows nothing rather than the
// wrong text. Boss casts are Action rows with an empty description, so
// they come back null too.
//
// The description is asked for `@as(html)`, which keeps the game's
// keyword colours (green "Additional Effect:", yellow status names) as
// <span style="color:rgba(…)"> and line breaks as <br>. It's parsed into
// plain segments here, never injected as HTML.

export type XivSegment = { text: string; color?: string } | { br: true };

export type XivTooltip = {
  kind:        "action" | "status";
  description: XivSegment[];
  category?:   string;   // Spell / Weaponskill / Ability
  castMs?:     number;   // 0 = instant
  recastMs?:   number;
  mpCost?:     number;   // a gauge cost is a line in the description, as in-game
  range?:      number;   // yalms
  radius?:     number;
  level?:      number;
  job?:        string;   // "Dancer"; none for role actions
  affinity?:   string;   // ClassJobCategory name ("AST", "GLA MRD PLD …")
} | null;

const API = "https://v2.xivapi.com/api/sheet";
const STATUS_OFFSET = 1_000_000;
const TTL_MS = 7 * 24 * 3600 * 1000;
const STORE_PREFIX = "xivapi4:";  // bump when XivTooltip's shape changes
const MP_COST_TYPE = 3;
const ACTION_FIELDS = "Name,ActionCategory.Name,Cast100ms,Recast100ms,PrimaryCostType,PrimaryCostValue,Range,EffectRange,ClassJobLevel,ClassJobCategory.Name,ClassJob.NameEnglish,ClassJob.Role";
const memory = new Map<string, Promise<XivTooltip>>();

function urlOf(id: number): { key: string; url: string; status: boolean } {
  if (id >= STATUS_OFFSET) {
    const row = id - STATUS_OFFSET;
    return { key: `Status/${row}`, status: true, url: `${API}/Status/${row}?fields=Name,Description@as(html)` };
  }
  return { key: `Action/${id}`, status: false, url: `${API}/Action/${id}?fields=${ACTION_FIELDS}&transient=Description@as(html)` };
}

function readStore(key: string): XivTooltip | undefined {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return undefined;
    const v = JSON.parse(raw) as { at: number; tip: XivTooltip };
    return Date.now() - v.at < TTL_MS ? v.tip : undefined;
  } catch { return undefined; }
}
function writeStore(key: string, tip: XivTooltip) {
  try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify({ at: Date.now(), tip })); } catch { /* private window */ }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e]);

/** XIVAPI's description HTML → segments: <br>, coloured <span>s, text. Other tags are dropped. */
export function parseXivHtml(html: string): XivSegment[] {
  const out: XivSegment[] = [];
  const colors: (string | undefined)[] = [];
  for (const m of html.matchAll(/<br\s*\/?>|<span\b([^>]*)>|<\/span>|<[^>]*>|[^<]+/gi)) {
    const tok = m[0];
    if (/^<br/i.test(tok)) out.push({ br: true });
    else if (/^<span/i.test(tok)) {
      const c = /color:\s*(rgba?\([\d.,\s]+\)|#[0-9a-f]{3,8})/i.exec(m[1] ?? "")?.[1];
      colors.push(c ?? colors[colors.length - 1]);
    } else if (/^<\/span/i.test(tok)) colors.pop();
    else if (!tok.startsWith("<")) {
      const color = colors[colors.length - 1];
      out.push(color ? { text: decode(tok), color } : { text: decode(tok) });
    }
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type Row = {
  fields?: {
    Name?: string; "Description@as(html)"?: string;
    ActionCategory?: { fields?: { Name?: string } }; ClassJobCategory?: { fields?: { Name?: string } };
    Cast100ms?: number; Recast100ms?: number; PrimaryCostType?: number; PrimaryCostValue?: number;
    Range?: number; EffectRange?: number; ClassJobLevel?: number;
    ClassJob?: { fields?: { NameEnglish?: string; Role?: number } };
  };
  transient?: { "Description@as(html)"?: string };
};

function toTooltip(j: Row, status: boolean): XivTooltip {
  const f = j.fields ?? {};
  const html = (j.transient?.["Description@as(html)"] ?? f["Description@as(html)"] ?? "").trim();
  if (!html) return null;
  const description = parseXivHtml(html);
  if (status) return { kind: "status", description };
  return {
    kind: "action", description,
    category: f.ActionCategory?.fields?.Name || undefined,
    castMs:   f.Cast100ms !== undefined ? f.Cast100ms * 100 : undefined,
    recastMs: f.Recast100ms !== undefined ? f.Recast100ms * 100 : undefined,
    mpCost:   f.PrimaryCostType === MP_COST_TYPE && f.PrimaryCostValue ? f.PrimaryCostValue * 100 : undefined,
    // -1: the job's auto-attack range, 3y for tanks and melee (Role 1, 2),
    // 25y for ranged and healers (3, 4): Saber Dance is 25y, Sonic Break 3y.
    range:    f.Range === undefined ? undefined : f.Range >= 0 ? f.Range : (f.ClassJob?.fields?.Role ?? 0) >= 3 ? 25 : 3,
    radius:   f.EffectRange,
    level:    f.ClassJobLevel || undefined,
    affinity: f.ClassJobCategory?.fields?.Name || undefined,
    job:      f.ClassJob?.fields?.NameEnglish || undefined,
  };
}

/** The ability's in-game tooltip data, or null when XIVAPI has none for it. */
export function fetchXivTooltip(id: number, name: string): Promise<XivTooltip> {
  const { key, url, status } = urlOf(id);
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
      const j = await r.json() as Row;
      if (norm(j.fields?.Name ?? "") !== norm(name)) return null;
      return toTooltip(j, status);
    })
    .then((tip) => { writeStore(key, tip); return tip; })
    .catch(() => { memory.delete(key); return null; });  // network error: retry on a later hover
  memory.set(key, p);
  return p;
}
