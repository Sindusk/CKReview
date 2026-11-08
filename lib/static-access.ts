// lib/static-access.ts
//
// The one role check every /api/statics/[staticId]/* route goes through.
// Roles rank OWNER > MODERATOR > MEMBER:
//   MEMBER     view-only (every GET).
//   MODERATOR  + add/resync/relabel reviews, edit pull summaries, merge and
//              rename players, delete reviews (and players) they added.
//   OWNER      everything: delete the static, any review or player, and
//              manage members and their roles.
// Membership rows live in StaticMember; the accounts in the shared users DB.

import { NextResponse } from "next/server";
import type { StaticMember, StaticMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RANK: Record<StaticMemberRole, number> = { MEMBER: 0, MODERATOR: 1, OWNER: 2 };

export function hasStaticRole(role: StaticMemberRole, minRole: StaticMemberRole): boolean {
  return RANK[role] >= RANK[minRole];
}

/**
 * The caller's membership when their role is at least `minRole`, else the
 * 403 to return (or 401 with no user). Usage:
 *   const access = await requireStaticRole(staticId, user?.id, "MODERATOR");
 *   if (access instanceof NextResponse) return access;
 */
export async function requireStaticRole(
  staticId: number,
  userId:   number | null | undefined,
  minRole:  StaticMemberRole = "MEMBER",
): Promise<StaticMember | NextResponse> {
  if (userId == null) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });
  if (!hasStaticRole(membership.role, minRole)) {
    const need = minRole === "OWNER" ? "the static's owner" : "a moderator or the owner";
    return NextResponse.json({ error: `Only ${need} can do this` }, { status: 403 });
  }
  return membership;
}
