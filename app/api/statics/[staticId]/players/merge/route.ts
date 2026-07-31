// app/api/statics/[staticId]/players/merge/route.ts
//
// Merges two canonical player identities together — the manual step behind
// StaticPlayerIdentity's whole reason for existing (a reviewer recognizing
// that e.g. "Salty Dango" and "Kup'o Noodles" are the same person after a
// log name change). Moves every alias and every StaticReviewPullPlayerError
// row from `fromIdentityId` onto `intoIdentityId`, then deletes the loser.
// `intoIdentityId`'s name is left as-is — rename it separately via
// PATCH /api/statics/[staticId]/players/[identityId] if the newer name
// should become canonical.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
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

  const body = await req.json();
  const intoIdentityId = Number(body?.intoIdentityId);
  const fromIdentityId = Number(body?.fromIdentityId);
  if (!Number.isInteger(intoIdentityId) || !Number.isInteger(fromIdentityId)) {
    return NextResponse.json({ error: "intoIdentityId and fromIdentityId are required" }, { status: 400 });
  }
  if (intoIdentityId === fromIdentityId) {
    return NextResponse.json({ error: "Cannot merge an identity into itself" }, { status: 400 });
  }

  const [into, from] = await Promise.all([
    prisma.staticPlayerIdentity.findUnique({ where: { id: intoIdentityId } }),
    prisma.staticPlayerIdentity.findUnique({ where: { id: fromIdentityId } }),
  ]);
  if (!into || into.staticId !== staticId || !from || from.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.staticPlayerAlias.updateMany({
      where: { identityId: fromIdentityId },
      data:  { identityId: intoIdentityId },
    }),
    prisma.staticReviewPullPlayerError.updateMany({
      where: { identityId: fromIdentityId },
      data:  { identityId: intoIdentityId },
    }),
    prisma.staticPlayerIdentity.delete({ where: { id: fromIdentityId } }),
  ]);

  return NextResponse.json({ ok: true });
}
