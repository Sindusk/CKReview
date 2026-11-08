// app/api/statics/[staticId]/members/route.ts
//
// GET lists the static's members (any member). POST adds an existing
// account by username with role MEMBER (default) or MODERATOR — owner only.
// Role changes are PATCH members/[userId]; roles are in lib/static-access.ts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { usersPool } from "@/lib/usersDb";
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

  const members = await prisma.staticMember.findMany({ where: { staticId }, orderBy: { addedAt: "asc" } });

  // StaticMember.userId isn't an FK into this app's own schema (that
  // account lives in the shared users DB), so usernames are resolved with
  // a separate lookup against usersPool rather than a Prisma include.
  const userIds = members.map(m => m.userId);
  const usernames = userIds.length
    ? await usersPool.query<{ id: number; username: string }>(
        "SELECT id, username FROM app_user WHERE id = ANY($1)",
        [userIds],
      )
    : { rows: [] as { id: number; username: string }[] };
  const usernameById = new Map<number, string>(usernames.rows.map(r => [r.id, r.username]));

  return NextResponse.json({
    members: members.map(m => ({
      userId:   m.userId,
      username: usernameById.get(m.userId) ?? `user#${m.userId}`,
      role:     m.role,
      addedAt:  m.addedAt,
    })),
  });
}

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

  const membership = await requireStaticRole(staticId, user.id, "OWNER");
  if (membership instanceof NextResponse) return membership;

  const body = await req.json();
  const username = String(body?.username || "").trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  const role = body?.role ?? "MEMBER";
  if (role !== "MEMBER" && role !== "MODERATOR") {
    return NextResponse.json({ error: "role must be MEMBER or MODERATOR" }, { status: 400 });
  }

  // No auto-create here (unlike login) — this claims an *existing* account,
  // it doesn't create one on the invitee's behalf.
  const found = await usersPool.query("SELECT id FROM app_user WHERE username = $1", [username]);
  if (found.rowCount === 0) {
    return NextResponse.json({ error: "No account with that username" }, { status: 404 });
  }
  const targetUserId: number = found.rows[0].id;

  const existing = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: targetUserId } },
  });
  if (existing) {
    return NextResponse.json({ error: "That account is already a member" }, { status: 409 });
  }

  const added = await prisma.staticMember.create({
    data: { staticId, userId: targetUserId, role },
  });

  return NextResponse.json({
    member: { userId: added.userId, username, role: added.role, addedAt: added.addedAt },
  });
}
