// app/api/statics/[staticId]/analysis/players/[identityId]/route.ts
//
// One player's mechanic ranking over the static's detailed sessions, with
// chances limited to the pulls they played, plus their counted errors'
// timestamps for the fight-timeline strip. Query: boss, sessions (last N)
// or from/to, phase, includeMinors. Counting rules live in
// lib/static-analysis.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  computeMechanicStats, computePlayerTimeline, contextSummary, loadAnalysisContext, parseAnalysisFilter,
} from "@/lib/static-analysis";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ staticId: string; identityId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, identityId: identityIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const identityId = Number(identityIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(identityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const identity = await prisma.staticPlayerIdentity.findUnique({ where: { id: identityId } });
  if (!identity || identity.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filter = parseAnalysisFilter(req.nextUrl.searchParams);
  const ctx = await loadAnalysisContext(staticId, filter);
  const played = ctx.pulls.filter((p) => p.roster.has(identityId));

  return NextResponse.json({
    ...contextSummary(ctx),
    filter: { phase: filter.phase, includeMinors: filter.includeMinors },
    player: { id: identity.id, name: identity.name },
    pullsPlayed: played.length,
    // Timeline scale: the longest pull they played.
    maxDurationMs: played.reduce((max, p) => Math.max(max, p.durationMs), 0),
    mechanics: computeMechanicStats(ctx, filter, identityId),
    timeline: computePlayerTimeline(ctx, filter, identityId),
  });
}
