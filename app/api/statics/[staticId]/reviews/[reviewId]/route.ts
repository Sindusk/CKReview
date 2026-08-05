// app/api/statics/[staticId]/reviews/[reviewId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Renames a review's label — the session heading on the static dashboard.
 * Any member of the static can edit it (unlike DELETE, which is restricted
 * to the adder/owner): a label is shared context for the group, and a wrong
 * one is cheap to fix and impossible to lose data over.
 *
 * An empty/whitespace label clears it back to null rather than storing "".
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staticId: string; reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, reviewId: reviewIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const reviewId = Number(reviewIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const review = await prisma.staticReview.findUnique({ where: { id: reviewId } });
  if (!review || review.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  if (typeof body?.label !== "string") {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const label = body.label.trim() || null;
  const updated = await prisma.staticReview.update({
    where: { id: reviewId },
    data:  { label },
  });

  return NextResponse.json({ review: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ staticId: string; reviewId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, reviewId: reviewIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const reviewId = Number(reviewIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const review = await prisma.staticReview.findUnique({ where: { id: reviewId } });
  if (!review || review.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete = membership.role === "OWNER" || review.addedByUserId === user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "Only the member who added this review or an owner can remove it" }, { status: 403 });
  }

  // Only removes the association row — never touches data/sessions/*.
  await prisma.staticReview.delete({ where: { id: reviewId } });

  return NextResponse.json({ ok: true });
}
