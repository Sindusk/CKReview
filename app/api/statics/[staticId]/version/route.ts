// app/api/statics/[staticId]/version/route.ts
//
// A cheap "has this static's data changed?" check for the dashboard's
// new-report notice: the number of sessions and the highest pull id. Adding
// a session creates pulls, a resync deletes and recreates its pulls (new
// ids), and a removal drops the count, so any of them changes `version`;
// label and note edits don't. Two aggregate queries, no rows.

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

  const [reviews, pulls] = await Promise.all([
    prisma.staticReview.count({ where: { staticId } }),
    prisma.staticReviewPull.aggregate({ where: { review: { staticId } }, _max: { id: true } }),
  ]);
  return NextResponse.json({ reviews, version: `${reviews}:${pulls._max.id ?? 0}` });
}
