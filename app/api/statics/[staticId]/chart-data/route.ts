// app/api/statics/[staticId]/chart-data/route.ts
//
// Feeds StaticErrorChart and the static dashboard's pull list: every pull
// ever imported into this static's reviews, in chronological order (by
// review addedAt, then pullNumber within a review), with each player's
// per-pull Major/Minor error counts, resolved player identity (see
// StaticPlayerIdentity), and job/spec snapshot. The client computes the
// cumulative running totals shown on the chart — this route just hands
// over the raw per-pull numbers so the client can also support a
// Major-only toggle without a second round-trip.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const reviews = await prisma.staticReview.findMany({
    where:   { staticId },
    orderBy: { addedAt: "asc" },
    include: {
      pulls: {
        orderBy: { pullNumber: "asc" },
        include: { playerErrors: { include: { identity: true } } },
      },
    },
  });

  const pulls = reviews.flatMap((review) =>
    review.pulls.map((pull) => ({
      id:            pull.id,
      reviewId:      review.id,
      reviewLabel:   review.label,
      fightId:       pull.fightId,
      pullNumber:    pull.pullNumber,
      bossName:      pull.bossName,
      result:        pull.result,
      game:          pull.game,
      durationMs:    pull.durationMs,
      raidErrorAtMs: pull.raidErrorAtMs,
      summary:       pull.summary,
      players:       pull.playerErrors.map((pe) => ({
        player:      pe.player,
        identityId:  pe.identityId,
        // Falls back to the raw log name for rows written before identity
        // resolution existed (identityId null) — see the schema comment.
        identityName: pe.identity?.name ?? pe.player,
        className:   pe.className,
        specId:      pe.specId,
        role:        pe.role,
        majorCount:  pe.majorCount,
        minorCount:  pe.minorCount,
      })),
    }))
  );

  return NextResponse.json({ pulls });
}
