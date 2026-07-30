// app/api/statics/[staticId]/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { StaticReviewPullData } from "@/lib/static-review-data";

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

  const reviews = await prisma.staticReview.findMany({
    where:   { staticId },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({ reviews });
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
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const body = await req.json();
  const sessionId = String(body?.sessionId || "").trim();
  const reportUrl = String(body?.reportUrl || "").trim();
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : null;
  const pulls: StaticReviewPullData[] = Array.isArray(body?.pulls) ? body.pulls : [];

  if (!sessionId || !reportUrl) {
    return NextResponse.json({ error: "sessionId and reportUrl are required" }, { status: 400 });
  }

  try {
    const review = await prisma.staticReview.create({
      data: {
        staticId,
        sessionId,
        reportUrl,
        label,
        addedByUserId: user.id,
        pulls: {
          create: pulls.map((p) => ({
            fightId:    p.fightId,
            pullNumber: p.pullNumber,
            bossName:   p.bossName,
            result:     p.result,
            startTime:  p.startTime,
            endTime:    p.endTime,
            playerErrors: {
              create: p.players.map((pl) => ({
                player:     pl.player,
                majorCount: pl.majorCount,
                minorCount: pl.minorCount,
              })),
            },
          })),
        },
      },
    });
    return NextResponse.json({ review });
  } catch (err) {
    // Re-adding an already-linked review (double-click, or deliberately
    // re-clicking "Add" after linking a mitigation sheet / fixing a
    // detection rule) is expected, not an error — the
    // @@unique([staticId, sessionId]) constraint just means we UPSERT: wipe
    // and recreate the pulls/player-error rows from the current pulls[]
    // payload, since that's the only place fresher data can come from (the
    // server never re-derives it itself — see computeStaticReviewPullData's
    // module comment).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.staticReview.findUnique({
        where: { staticId_sessionId: { staticId, sessionId } },
      });
      if (!existing) throw err;

      const review = await prisma.$transaction(async (tx) => {
        // Carry forward hand-written notes (StaticReviewPull.summary) by
        // fightId — a resync should refresh the auto-detected error counts
        // without wiping out something a reviewer typed in by hand.
        const priorPulls = await tx.staticReviewPull.findMany({
          where:  { staticReviewId: existing.id },
          select: { fightId: true, summary: true },
        });
        const priorSummaries = new Map(priorPulls.map((p) => [p.fightId, p.summary]));

        await tx.staticReviewPull.deleteMany({ where: { staticReviewId: existing.id } });

        return tx.staticReview.update({
          where: { id: existing.id },
          data: {
            label: label ?? existing.label,
            pulls: {
              create: pulls.map((p) => ({
                fightId:    p.fightId,
                pullNumber: p.pullNumber,
                bossName:   p.bossName,
                result:     p.result,
                startTime:  p.startTime,
                endTime:    p.endTime,
                summary:    priorSummaries.get(p.fightId) ?? null,
                playerErrors: {
                  create: p.players.map((pl) => ({
                    player:     pl.player,
                    majorCount: pl.majorCount,
                    minorCount: pl.minorCount,
                  })),
                },
              })),
            },
          },
        });
      });
      return NextResponse.json({ review, resynced: true });
    }
    throw err;
  }
}
