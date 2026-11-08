// app/api/statics/[staticId]/members/[userId]/route.ts
//
// PATCH changes a member's role between MEMBER and MODERATOR (owner only;
// an OWNER row is never changed and nobody is made OWNER here). DELETE: the
// owner removes anyone else, anyone else removes themselves ("leave"); the
// owner's own row is never removed. Roles are in
// lib/static-access.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireStaticRole } from "@/lib/static-access";

type Ctx = { params: Promise<{ staticId: string; userId: string }> };

async function parseIds({ params }: Ctx) {
  const { staticId: staticIdRaw, userId: targetUserIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const targetUserId = Number(targetUserIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(targetUserId)) return null;
  return { staticId, targetUserId };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const ids = await parseIds(ctx);
  if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { staticId, targetUserId } = ids;

  const membership = await requireStaticRole(staticId, user.id, "OWNER");
  if (membership instanceof NextResponse) return membership;

  const body = await req.json();
  const role = body?.role;
  if (role !== "MEMBER" && role !== "MODERATOR") {
    return NextResponse.json({ error: "role must be MEMBER or MODERATOR" }, { status: 400 });
  }

  const target = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: targetUserId } },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Covers the owner demoting themself too: their own row is the OWNER row.
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The owner's role can't be changed" }, { status: 400 });
  }

  const updated = await prisma.staticMember.update({
    where: { id: target.id },
    data:  { role },
  });

  return NextResponse.json({ member: { userId: updated.userId, role: updated.role } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const ids = await parseIds(ctx);
  if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { staticId, targetUserId } = ids;

  const membership = await requireStaticRole(staticId, user.id, "MEMBER");
  if (membership instanceof NextResponse) return membership;

  // An owner can remove anyone; anyone can remove themselves ("leave").
  const isSelf = targetUserId === user.id;
  if (!isSelf && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can remove other members" }, { status: 403 });
  }
  // The OWNER row stays: leaving would orphan the static (delete it instead).
  if (isSelf && membership.role === "OWNER") {
    return NextResponse.json({ error: "The owner can't leave; delete the static instead" }, { status: 400 });
  }

  await prisma.staticMember.deleteMany({ where: { staticId, userId: targetUserId } });

  return NextResponse.json({ ok: true });
}
