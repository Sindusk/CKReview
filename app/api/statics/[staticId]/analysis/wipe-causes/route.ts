// app/api/statics/[staticId]/analysis/wipe-causes/route.ts
//
// What ended the static's wipes, ranked, for the detailed sessions. With
// `phase`, only wipes that ended in that phase. Query: boss, sessions (last
// N) or from/to, phase. The cause itself is computed at import
// (lib/static-review-data.ts computeWipeCause).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computeWipeCauses, contextSummary, loadAnalysisContext, parseAnalysisFilter } from "@/lib/static-analysis";

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
    filter: { phase: filter.phase },
    ...computeWipeCauses(ctx, filter),
  });
}
