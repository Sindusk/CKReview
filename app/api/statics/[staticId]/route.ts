// app/api/statics/[staticId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireStaticRole } from "@/lib/static-access";

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

  const membership = await requireStaticRole(staticId, user.id, "MEMBER");
  if (membership instanceof NextResponse) return membership;

  const staticRow = await prisma.static.findUnique({ where: { id: staticId } });
  if (!staticRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // viewerUserId lets the page offer Remove on a moderator's own reviews.
  return NextResponse.json({ static: { ...staticRow, role: membership.role, viewerUserId: user.id } });
}

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

  const membership = await requireStaticRole(staticId, user.id, "OWNER");
  if (membership instanceof NextResponse) return membership;

  // Cascades to StaticMember/StaticReview via onDelete: Cascade.
  await prisma.static.delete({ where: { id: staticId } });

  return NextResponse.json({ ok: true });
}
