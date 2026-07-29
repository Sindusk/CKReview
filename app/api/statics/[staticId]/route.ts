// app/api/statics/[staticId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
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
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can delete this static" }, { status: 403 });
  }

  // Cascades to StaticMember/StaticReview via onDelete: Cascade.
  await prisma.static.delete({ where: { id: staticId } });

  return NextResponse.json({ ok: true });
}
