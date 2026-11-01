// lib/session-access.ts
//
// Who owns a saved session (lib/session-store.ts). A session belongs to the
// logged-in user who created it: only they find it through the
// duplicate-log lookup and only they can save over it. Anyone with its
// link (/?session=<id>, e.g. a static page's review list) can open it
// read-only; their changes aren't saved (app/page.tsx persistSession).
// Logged-out visitors never get a session created.
//
// Sessions saved before owners existed (2026-11-01) have no ownerUserId.
// The first time one is read here it takes the user who first added it to
// a static, and that is written back; one on no static stays ownerless
// (read-only for everyone).

import { prisma } from "@/lib/prisma";
import { writeSession } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";

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
