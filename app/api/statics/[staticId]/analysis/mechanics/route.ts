// app/api/statics/[staticId]/analysis/mechanics/route.ts
//
// Raid-wide mechanic ranking for the static's detailed sessions: per
// mechanic, failures out of chances, raw error count, players involved and
// a per-session trend. Query: boss, sessions (last N) or from/to, phase,
// includeMinors. Counting rules live in lib/static-analysis.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computeMechanicStats, contextSummary, loadAnalysisContext, parseAnalysisFilter } from "@/lib/static-analysis";

export async function GET(
  req: NextRequest,
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

  const filter = parseAnalysisFilter(req.nextUrl.searchParams);
  const ctx = await loadAnalysisContext(staticId, filter);

  return NextResponse.json({
    ...contextSummary(ctx),
    filter: { phase: filter.phase, includeMinors: filter.includeMinors },
    mechanics: computeMechanicStats(ctx, filter),
  });
}
