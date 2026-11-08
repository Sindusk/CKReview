// app/api/statics/[staticId]/reviews/[reviewId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireStaticRole } from "@/lib/static-access";

/**
 * Renames a review's label — the session heading on the static dashboard.
 * Any moderator or the owner can edit it (unlike DELETE, which is restricted
 * to the adder/owner): a label is shared context for the group, and a wrong
 * one is cheap to fix and impossible to lose data over. MEMBER is view-only
 * (lib/static-access.ts).
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

  const membership = await requireStaticRole(staticId, user.id, "MODERATOR");
  if (membership instanceof NextResponse) return membership;

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

  // A moderator may remove reviews they added; the owner any review. A
  // MEMBER (view-only) can't, even one they added before roles existed.
  const membership = await requireStaticRole(staticId, user.id, "MODERATOR");
  if (membership instanceof NextResponse) return membership;

  const review = await prisma.staticReview.findUnique({ where: { id: reviewId } });
  if (!review || review.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete = membership.role === "OWNER" || review.addedByUserId === user.id;
  if (!canDelete) {
    return NextResponse.json({ error: "Only the moderator who added this review or the owner can remove it" }, { status: 403 });
  }

  // Only removes the association row — never touches data/sessions/*.
  await prisma.staticReview.delete({ where: { id: reviewId } });

  return NextResponse.json({ ok: true });
}
