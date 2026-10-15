// lib/mitigation/ffxiv-deployment.ts
//
// Scholar's "spreadlo": Adloquium (often a crit, adding Catalyze) spread to
// the party by Deployment Tactics. It is a big party shield on a 90s
// cooldown, so the Analysis should plan it like Sacred Soil or Expedient
// (user, 2026-10-15). The log can't tell it apart by status: the spread
// shields are the same Galvanize (1000297) and Catalyze (1001918) statuses
// as a single-target Adloquium or the party GCD shields (Concitation,
// Accession), which the catalog's always-used "galvanize" entry owns.
//
// So the mitigation views see a copy of each pull where a Galvanize or
// Catalyze on a player is renamed to its "spread" status
// (DEPLOYMENT_STATUS_OFFSET + id, owned by the catalog's deployment-tactics
// entry) when the shield's Scholar last gave it out by Deployment Tactics:
// a Deployment cast within the shield's 30s before the hit, later than
// that Scholar's last Concitation / Accession / Succor and later than
// their last Adloquium on that player. The Adloquium's own target (often the
// Scholar) is counted with the spread: it's the same plan.
// Seen in JZ1KXhDbqkNH3jxR (FRU): Adloquium on self, Deployment ~0.5-1s
// later, then every party member's Galvanize absorbing under that caster.
//
// Only the copy changes: damage-taken statuses and shield absorbs. The
// damage analysis and everything else read the original pull.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";

export const DEPLOYMENT_STATUS_OFFSET = 90_000_000;
const GALVANIZE = 1000297;
const CATALYZE = 1001918;
const SPREAD = new Set([GALVANIZE, CATALYZE]);
const DEPLOYMENT_TACTICS = 3585;
const ADLOQUIUM = 185;
const PARTY_GALVANIZE = new Set([186, 37013, 37016]);  // Succor, Concitation, Accession
const SHIELD_MS = 30_000;
const SLACK_MS = 1_000;

const cache = new WeakMap<Pull, Pull>();

type ScholarCasts = { name: string; deploy: number[]; party: number[]; adloOn: Map<string, number[]> };

/** The pull with spreadlo shields renamed to their Deployment Tactics statuses (memoized). */
export function withDeploymentShields(pull: Pull): Pull {
  const hit = cache.get(pull);
  if (hit) return hit;
  const scholars: ScholarCasts[] = pull.players.filter((p) => p.className === "Scholar").map((p) => {
    const adloOn = new Map<string, number[]>();
    for (const c of p.casts) {
      if (c.abilityId !== ADLOQUIUM) continue;
      const target = c.target || p.name;
      adloOn.set(target, [...(adloOn.get(target) ?? []), c.timestamp]);
    }
    return {
      name:   p.name,
      deploy: p.casts.filter((c) => c.abilityId === DEPLOYMENT_TACTICS).map((c) => c.timestamp),
      party:  p.casts.filter((c) => PARTY_GALVANIZE.has(c.abilityId)).map((c) => c.timestamp),
      adloOn,
    };
  });
  if (!scholars.some((s) => s.deploy.length > 0)) { cache.set(pull, pull); return pull; }

  const latest = (ts: number[] | undefined, atMs: number) => {
    let best = -Infinity;
    for (const t of ts ?? []) if (t <= atMs + SLACK_MS && t > best) best = t;
    return best;
  };
  // Whether `caster`'s shield on `player` at `atMs` came from a Deployment.
  const spread = (caster: ScholarCasts, player: string, atMs: number) => {
    const d = latest(caster.deploy, atMs);
    return atMs - d <= SHIELD_MS + SLACK_MS && d > latest(caster.party, atMs) && d >= latest(caster.adloOn.get(player), atMs);
  };
  const byName = new Map(scholars.map((s) => [s.name, s]));
  // A status on a damage event names no caster: the absorb at that hit
  // does, else the only Scholar.
  const casterOf = (p: PlayerInfo, atMs: number, statusId: number): ScholarCasts | undefined => {
    const abs = p.shieldAbsorbs?.find((a) => a.statusId === statusId && Math.abs(a.timestamp - atMs) <= 100 && a.caster);
    return abs ? byName.get(abs.caster!) : scholars.length === 1 ? scholars[0] : undefined;
  };

  const players = pull.players.map((p) => {
    let changed = false;
    const damageTaken = p.damageTaken.map((e) => {
      const ids = e.statusIds;
      if (!ids?.some((id) => SPREAD.has(id))) return e;
      const next = ids.map((id) => {
        if (!SPREAD.has(id)) return id;
        const caster = casterOf(p, e.timestamp, id);
        return caster && spread(caster, p.name, e.timestamp) ? id + DEPLOYMENT_STATUS_OFFSET : id;
      });
      if (next.every((id, i) => id === ids[i])) return e;
      changed = true;
      return { ...e, statusIds: next };
    });
    const shieldAbsorbs = p.shieldAbsorbs?.map((a) => {
      if (!SPREAD.has(a.statusId) || !a.caster) return a;
      const caster = byName.get(a.caster);
      if (!caster || !spread(caster, p.name, a.timestamp)) return a;
      changed = true;
      return { ...a, statusId: a.statusId + DEPLOYMENT_STATUS_OFFSET };
    });
    return changed ? { ...p, damageTaken, shieldAbsorbs } : p;
  });
  const out = players.every((p, i) => p === pull.players[i]) ? pull : { ...pull, players };
  cache.set(pull, out);
  return out;
}
