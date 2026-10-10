// app/api/statics/[staticId]/players/[identityId]/route.ts
//
// PATCH renames a canonical player identity's display name (e.g. after
// merging "Salty Dango" into "Kup'o Noodles", pick which one the chart
// should show going forward) — doesn't touch aliases, just the label.
//
// DELETE removes a player who doesn't belong in the static (a log that
// also holds a dungeon or another group's pulls pollutes the roster): every
// pull any of the player's aliases appears in is deleted with all its
// rows, even when static members were in it too. A review left with no
// pulls is detached from the static. Each alias is recorded as a
// StaticExcludedPlayer for the affected sessions, so resyncing them keeps
// those pulls out; new sessions are unaffected. GET returns the counts the
// confirmation dialog shows, from the database only.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ staticId: string; identityId: string }> };

/** Auth, membership and ownership checks shared by every method. */
async function loadIdentity({ params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Login required" }, { status: 401 }) };

  const { staticId: staticIdRaw, identityId: identityIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const identityId = Number(identityIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(identityId)) {
    return { error: NextResponse.json({ error: "Invalid id" }, { status: 400 }) };
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return { error: NextResponse.json({ error: "Not a member of this static" }, { status: 403 }) };

  const identity = await prisma.staticPlayerIdentity.findUnique({
    where:   { id: identityId },
    include: { aliases: { select: { name: true } } },
  });
  if (!identity || identity.staticId !== staticId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { user, membership, staticId, identity };
}

/**
 * Every pull the identity appears in, by resolved identity or by raw alias
 * name (count rows written before identities existed have no identityId).
 */
async function findAffectedPulls(staticId: number, identityId: number, aliases: string[]) {
  return prisma.staticReviewPull.findMany({
    where: {
      review:       { staticId },
      playerErrors: { some: { OR: [{ identityId }, { player: { in: aliases } }] } },
    },
    select: {
      id:     true,
      review: { select: { id: true, sessionId: true, addedByUserId: true, label: true, reportUrl: true } },
    },
  });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const loaded = await loadIdentity(ctx);
  if ("error" in loaded) return loaded.error;
  const { staticId, identity } = loaded;

  const pulls = await findAffectedPulls(staticId, identity.id, identity.aliases.map((a) => a.name));
  const sessions = new Set(pulls.map((p) => p.review.id));
  return NextResponse.json({ pulls: pulls.length, sessions: sessions.size });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const loaded = await loadIdentity(ctx);
  if ("error" in loaded) return loaded.error;
  const { user, membership, staticId, identity } = loaded;

  const aliases = identity.aliases.map((a) => a.name);
  const pulls = await findAffectedPulls(staticId, identity.id, aliases);
  const reviews = new Map(pulls.map((p) => [p.review.id, p.review]));

  // Same rule as detaching a review (reviews/[reviewId] DELETE): an owner,
  // or the member who added every review this touches.
  if (membership.role !== "OWNER") {
    const foreign = [...reviews.values()].find((r) => r.addedByUserId !== user.id);
    if (foreign) {
      return NextResponse.json({
        error: `Only the static's owner can delete this player: a session they appear in ` +
               `(${foreign.label ?? foreign.reportUrl}) was added by another member.`,
      }, { status: 403 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.staticExcludedPlayer.createMany({
      data: [...reviews.values()].flatMap((r) =>
        aliases.map((name) => ({ staticId, sessionId: r.sessionId, name }))),
      skipDuplicates: true,
    });

    // Cascades to every count and detail row of these pulls.
    await tx.staticReviewPull.deleteMany({ where: { id: { in: pulls.map((p) => p.id) } } });

    const emptied = await tx.staticReview.findMany({
      where:  { id: { in: [...reviews.keys()] }, pulls: { none: {} } },
      select: { id: true },
    });
    await tx.staticReview.deleteMany({ where: { id: { in: emptied.map((r) => r.id) } } });

    // Cascades to the aliases.
    await tx.staticPlayerIdentity.delete({ where: { id: identity.id } });

    // The deleted pulls usually held the rest of that other group too;
    // anyone left with no pulls at all would sit in the roster at zero.
    const orphans = await tx.staticPlayerIdentity.deleteMany({
      where: { staticId, errors: { none: {} }, detailErrors: { none: {} } },
    });

    return { pulls: pulls.length, sessionsRemoved: emptied.length, orphansRemoved: orphans.count };
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const loaded = await loadIdentity(ctx);
  if ("error" in loaded) return loaded.error;

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const updated = await prisma.staticPlayerIdentity.update({
    where: { id: loaded.identity.id },
    data:  { name },
  });

  return NextResponse.json({ player: updated });
}
