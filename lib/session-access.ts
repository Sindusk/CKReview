// lib/session-access.ts
//
// Who may see a saved session (lib/session-store.ts). A session belongs to
// the logged-in user who created it: only they find it through the
// duplicate-log lookup and only they can save over it. Members of a static
// the session was added to may also open it (the static page links each
// review to /?session=<id>); a member's edits are saved to a new session
// of their own (app/page.tsx persistSession). Logged-out visitors get
// nothing, and no session is created for them.
//
// Sessions saved before owners existed (2026-11-01) have no ownerUserId.
// The first time one is read here it takes the user who first added it to
// a static, and that is written back; one on no static stays unreachable.

import { prisma } from "@/lib/prisma";
import { writeSession } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";

export type SessionAccess = "owner" | "member";

/** The session's owner, assigning one to a pre-owner session from its static reviews. */
export async function resolveSessionOwner(id: string, session: SavedSession): Promise<number | null> {
  if (typeof session.ownerUserId === "number") return session.ownerUserId;
  const review = await prisma.staticReview.findFirst({
    where:   { sessionId: id },
    orderBy: { addedAt: "asc" },
    select:  { addedByUserId: true },
  });
  if (!review) return null;
  session.ownerUserId = review.addedByUserId;
  await writeSession(id, session);
  return review.addedByUserId;
}

export async function sessionAccess(
  id:      string,
  session: SavedSession,
  userId:  number,
): Promise<SessionAccess | null> {
  if ((await resolveSessionOwner(id, session)) === userId) return "owner";
  const shared = await prisma.staticReview.findFirst({
    where:  { sessionId: id, static: { members: { some: { userId } } } },
    select: { id: true },
  });
  return shared ? "member" : null;
}
