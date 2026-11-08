// lib/local-log/status-categories.ts
//
// Whether a status is a buff or a debuff, which an ACT log doesn't say and
// FFLogs takes from game data: XIVAPI v2's Status sheet (the service the
// replay's action shapes already call from the browser). Checked against
// FFLogs on GKnDWAxdbmhNaV7c's Dancing Mad pulls, 2026-11-08: every status
// FFLogs lists as a buff has StatusCategory 1 (beneficial), every debuff 2
// (detrimental), except two category-1 statuses with no name (2056, the
// Phase 4 real/fake signal kefka-says.ts reads, and 2536), which FFLogs
// lists as debuffs. So: detrimental or nameless = debuff.
//
// Returns 2 for a debuff, 1 for a buff. Cached in memory; a failed lookup
// leaves the parser's source/target guess (act-report.ts).

const cache = new Map<number, number>();
const BATCH = 100;

export async function fetchStatusCategories(ids: number[]): Promise<Map<number, number>> {
  const todo = ids.filter((id) => !cache.has(id));
  for (let i = 0; i < todo.length; i += BATCH) {
    const rows = todo.slice(i, i + BATCH);
    const url = `https://v2.xivapi.com/api/sheet/Status?rows=${rows.join(",")}&fields=StatusCategory,Name`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`XIVAPI Status lookup failed (${res.status})`);
    const json = (await res.json()) as { rows?: { row_id: number; fields?: { StatusCategory?: number; Name?: string } }[] };
    for (const r of json.rows ?? []) {
      const c = r.fields?.StatusCategory;
      if (typeof c !== "number") continue;
      cache.set(r.row_id, c === 2 || !r.fields?.Name ? 2 : 1);
    }
  }
  return new Map(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]));
}

const itemCache = new Map<number, string>();

/**
 * Item names (potions, food) by Item row id, which the log names only
 * "item_<hex>". Same XIVAPI service, same cache-and-fall-back rule.
 */
export async function fetchItemNames(ids: number[]): Promise<Map<number, string>> {
  const todo = ids.filter((id) => !itemCache.has(id));
  for (let i = 0; i < todo.length; i += BATCH) {
    const rows = todo.slice(i, i + BATCH);
    const res = await fetch(`https://v2.xivapi.com/api/sheet/Item?rows=${rows.join(",")}&fields=Name`);
    if (!res.ok) throw new Error(`XIVAPI Item lookup failed (${res.status})`);
    const json = (await res.json()) as { rows?: { row_id: number; fields?: { Name?: string } }[] };
    for (const r of json.rows ?? []) if (r.fields?.Name) itemCache.set(r.row_id, r.fields.Name);
  }
  return new Map(ids.filter((id) => itemCache.has(id)).map((id) => [id, itemCache.get(id)!]));
}
