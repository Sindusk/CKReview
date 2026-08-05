// app/api/statics/[staticId]/players/route.ts
//
// Lists every canonical player identity for a static with its aliases (raw
// log names it's been seen under), most-common job (for the chart's
// class-color/icon — see StaticErrorChart's header for why "most common"
// rather than "current"), and participation stats. `pullsCount` counts
// EVERY pull this identity appeared in (including 0-error ones — see
// computeStaticReviewPullData's header on why 0-error rows are stored at
// all), so `errorRatePct` means something once substitutes are in the mix
// instead of just reflecting "how many pulls had >=1 error."
//
// Major and Minor counts are reported separately (with `totalErrors` kept
// as their sum) because the Players panel sorts and rates on Majors alone —
// Minors are noise-level mistakes that shouldn't drag a player's rate
// around. `errorRatePct` is therefore MAJORS per pull, not all errors.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ staticId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const staticId = Number((await params).staticId);
  if (!Number.isInteger(staticId)) {
    return NextResponse.json({ error: "Invalid static id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const identities = await prisma.staticPlayerIdentity.findMany({
    where:   { staticId },
    orderBy: { name: "asc" },
    include: {
      aliases: { select: { name: true } },
      errors: {
        select: {
          majorCount: true,
          minorCount: true,
          className:  true,
          specId:     true,
          pull:       { select: { game: true } },
        },
      },
    },
  });

  const players = identities.map((identity) => {
    let majorErrors = 0;
    let minorErrors = 0;
    const tally = new Map<string, { count: number; game: string; className: string; specId: number | null }>();

    for (const e of identity.errors) {
      majorErrors += e.majorCount;
      minorErrors += e.minorCount;
      if (!e.className) continue;
      const key = `${e.pull.game}::${e.className}::${e.specId ?? ""}`;
      const entry = tally.get(key) ?? { count: 0, game: e.pull.game, className: e.className, specId: e.specId };
      entry.count += 1;
      tally.set(key, entry);
    }

    let job: { game: string; className: string; specId: number | null } | null = null;
    let bestCount = 0;
    for (const entry of tally.values()) {
      if (entry.count > bestCount) { bestCount = entry.count; job = entry; }
    }

    const pullsCount = identity.errors.length;

    return {
      id:           identity.id,
      name:         identity.name,
      aliases:      identity.aliases.map((a) => a.name),
      job,
      majorErrors,
      minorErrors,
      totalErrors:  majorErrors + minorErrors,
      pullsCount,
      errorRatePct: pullsCount > 0 ? (majorErrors / pullsCount) * 100 : 0,
    };
  });

  return NextResponse.json({ players });
}
