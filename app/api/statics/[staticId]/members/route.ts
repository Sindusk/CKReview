// app/api/statics/[staticId]/members/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { usersPool } from "@/lib/usersDb";

async function requireMembership(staticId: number, userId: number) {
  return prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId } },
  });
}

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

  const membership = await requireMembership(staticId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const members = await prisma.staticMember.findMany({ where: { staticId } });

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

  const membership = await requireMembership(staticId, user.id);
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can add members" }, { status: 403 });
  }

  const body = await req.json();
  const username = String(body?.username || "").trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  // No auto-create here (unlike login) — this claims an *existing* account,
  // it doesn't create one on the invitee's behalf.
  const found = await usersPool.query("SELECT id FROM app_user WHERE username = $1", [username]);
  if (found.rowCount === 0) {
    return NextResponse.json({ error: "No account with that username" }, { status: 404 });
  }
  const targetUserId: number = found.rows[0].id;

  const added = await prisma.staticMember.upsert({
    where:  { staticId_userId: { staticId, userId: targetUserId } },
    update: {},
    create: { staticId, userId: targetUserId, role: "MEMBER" },
  });

  return NextResponse.json({ member: { userId: added.userId, username, role: added.role } });
}
