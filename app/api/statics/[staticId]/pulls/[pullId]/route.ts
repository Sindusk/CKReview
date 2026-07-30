// app/api/statics/[staticId]/pulls/[pullId]/route.ts
//
// Edits a single StaticReviewPull's freeform notes (see prisma/schema.prisma
// StaticReviewPull.summary) — the only thing about an imported pull that's
// ever hand-edited after the fact.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staticId: string; pullId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, pullId: pullIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const pullId = Number(pullIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(pullId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const pull = await prisma.staticReviewPull.findUnique({
    where:  { id: pullId },
    include: { review: true },
  });
  if (!pull || pull.review.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const summary = typeof body?.summary === "string" ? body.summary.trim() || null : null;

  const updated = await prisma.staticReviewPull.update({
    where: { id: pullId },
    data:  { summary },
  });

  return NextResponse.json({ pull: updated });
}
