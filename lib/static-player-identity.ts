// lib/static-player-identity.ts
//
// Server-only. Resolves raw log player names to a canonical
// StaticPlayerIdentity within one static, auto-creating a fresh
// identity+alias the first time a name is ever seen. See
// StaticPlayerIdentity's schema comment for why this exists — a player's
// log name isn't a stable join key across reports (observed: "Salty Dango"
// -> "Kup'o Noodles" across sessions of the same static). Merging two
// identities together afterward is a manual step — see
// POST /api/statics/[staticId]/players/merge.

import type { Prisma } from "@prisma/client";

/**
 * Resolves every distinct name in `playerNames` to its StaticPlayerIdentity
 * id within `staticId`, creating a new 1-alias identity for any name never
 * seen before in this static. Returns a name -> identityId map covering
 * every input name exactly once.
 */
export async function resolvePlayerIdentities(
  tx:          Prisma.TransactionClient,
  staticId:    number,
  playerNames: string[]
): Promise<Map<string, number>> {
  const distinct = Array.from(new Set(playerNames));
  const result = new Map<string, number>();
  if (distinct.length === 0) return result;

  const existing = await tx.staticPlayerAlias.findMany({
    where:  { staticId, name: { in: distinct } },
    select: { name: true, identityId: true },
  });
  for (const alias of existing) result.set(alias.name, alias.identityId);

  const unresolved = distinct.filter((name) => !result.has(name));
  for (const name of unresolved) {
    const identity = await tx.staticPlayerIdentity.create({
      data: {
        staticId,
        name,
        aliases: { create: { staticId, name } },
      },
    });
    result.set(name, identity.id);
  }

  return result;
}
