// app/api/statics/[staticId]/members/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ staticId: string; userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, userId: targetUserIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const targetUserId = Number(targetUserIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(targetUserId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  // An owner can remove anyone; anyone can remove themselves ("leave").
  const isSelf = targetUserId === user.id;
  if (!isSelf && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can remove other members" }, { status: 403 });
  }

  await prisma.staticMember.deleteMany({ where: { staticId, userId: targetUserId } });

  return NextResponse.json({ ok: true });
}
