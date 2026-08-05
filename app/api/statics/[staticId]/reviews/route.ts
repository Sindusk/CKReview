// app/api/statics/[staticId]/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { StaticReviewPullData } from "@/lib/static-review-data";
import { resolvePlayerIdentities } from "@/lib/static-player-identity";
import { parseLogUrl } from "@/lib/url-parsers";

async function requireMembership(staticId: number, userId: number) {
  return prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId } },
  });
}

function buildPullsCreateData(pulls: StaticReviewPullData[], identities: Map<string, number>) {
  return pulls.map((p) => ({
    fightId:       p.fightId,
    pullNumber:    p.pullNumber,
    bossName:      p.bossName,
    result:        p.result,
    game:          p.game,
    startTime:     p.startTime,
    endTime:       p.endTime,
    durationMs:    p.durationMs,
    raidErrorAtMs: p.raidErrorAtMs,
    playerErrors: {
      create: p.players.map((pl) => ({
        player:     pl.player,
        className:  pl.className ?? null,
        specId:     pl.specId ?? null,
        role:       pl.role ?? null,
        majorCount: pl.majorCount,
        minorCount: pl.minorCount,
        identityId: identities.get(pl.player) ?? null,
      })),
    },
  }));
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
  // Epoch ms from the client's loaded report (WCL/FFLogs report.startTime).
  // Absent for sample-data imports and for older clients, in which case the
  // review keeps whatever it already had rather than being cleared.
  const reportStartedAt =
    typeof body?.reportStartedAt === "number" && Number.isFinite(body.reportStartedAt)
      ? new Date(body.reportStartedAt)
      : null;
  const pulls: StaticReviewPullData[] = Array.isArray(body?.pulls) ? body.pulls : [];
  const allPlayerNames = pulls.flatMap((p) => p.players.map((pl) => pl.player));

  if (!sessionId || !reportUrl) {
    return NextResponse.json({ error: "sessionId and reportUrl are required" }, { status: 400 });
  }

  try {
    const review = await prisma.$transaction(async (tx) => {
      const identities = await resolvePlayerIdentities(tx, staticId, allPlayerNames);
      return tx.staticReview.create({
        data: {
          staticId,
          sessionId,
          reportUrl,
          label,
          reportStartedAt,
          addedByUserId: user.id,
          pulls: { create: buildPullsCreateData(pulls, identities) },
        },
      });
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

      // ...but only when it's genuinely the SAME log. A session that got
      // re-pointed at a different report (see app/page.tsx's
      // startNewSessionIfDifferentLog) would otherwise resync one night's
      // review into another night's pulls, destroying the original. Compare
      // parsed report codes, not raw urls, so cosmetic url differences
      // (#fight=… fragments, www., etc.) don't trip this.
      const existingLog = parseLogUrl(existing.reportUrl);
      const incomingLog = parseLogUrl(reportUrl);
      if (existingLog && incomingLog &&
          (existingLog.source !== incomingLog.source || existingLog.code !== incomingLog.code)) {
        return NextResponse.json({
          error:
            `This static already has a review linked to session "${sessionId}", but for a ` +
            `different report (${existingLog.code}). Import ${incomingLog.code} in a fresh ` +
            `session and add that instead — resyncing here would overwrite the other report's pulls.`,
        }, { status: 409 });
      }

      const review = await prisma.$transaction(async (tx) => {
        // Carry forward hand-written notes (StaticReviewPull.summary) by
        // fightId — a resync should refresh the auto-detected error counts
        // without wiping out something a reviewer typed in by hand.
        const priorPulls = await tx.staticReviewPull.findMany({
          where:  { staticReviewId: existing.id },
          select: { fightId: true, summary: true },
        });
        const priorSummaries = new Map(priorPulls.map((p) => [p.fightId, p.summary]));

        const identities = await resolvePlayerIdentities(tx, staticId, allPlayerNames);

        await tx.staticReviewPull.deleteMany({ where: { staticReviewId: existing.id } });

        const pullsCreateData = buildPullsCreateData(pulls, identities).map((p) => ({
          ...p,
          summary: priorSummaries.get(p.fightId) ?? null,
        }));

        return tx.staticReview.update({
          where: { id: existing.id },
          data: {
            label: label ?? existing.label,
            // A resync is how pre-existing reviews acquire a report date at
            // all, so fill it in — but never blank out a known date just
            // because this particular client couldn't supply one.
            reportStartedAt: reportStartedAt ?? existing.reportStartedAt,
            pulls: { create: pullsCreateData },
          },
        });
      });
      return NextResponse.json({ review, resynced: true });
    }
    throw err;
  }
}
