// app/api/statics/[staticId]/chart-data/route.ts
//
// Feeds StaticErrorChart and the static dashboard's pull list: every pull
// ever imported into this static's reviews, in chronological order (by
// the log's recorded date (see byLogDate), then pullNumber within a review), with each player's
// per-pull Major/Minor error counts, resolved player identity (see
// StaticPlayerIdentity), and job/spec snapshot. The client computes the
// rates and running totals shown on the chart — this route just hands
// over the raw per-pull numbers so the client can switch Major-only, the
// session range, fight and phase without a second round-trip. Detailed
// sessions also carry each pull's reached phases and per-phase counts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { byLogDate } from "@/lib/static-analysis";

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

  const [reviews, phaseRows] = await Promise.all([
    prisma.staticReview.findMany({
      where:   { staticId },
      orderBy: { addedAt: "asc" },
      include: {
        pulls: {
          orderBy: { pullNumber: "asc" },
          include: {
            playerErrors: { include: { identity: true } },
            // Detailed sessions only (detailVersion): the phases each pull
            // reached and its counted Major/Minor errors, for the chart's
            // phase filter.
            phases: { select: { phase: true } },
            errors: {
              where:  { afterCutoff: false, severity: { in: ["Major", "Minor"] } },
              select: { identityId: true, player: true, phase: true, severity: true },
            },
          },
        },
      },
    }),
    prisma.staticPhase.findMany({
      where:   { staticId },
      orderBy: [{ bossName: "asc" }, { phaseId: "asc" }],
      select:  { bossName: true, phaseId: true, name: true },
    }),
  ]);
  reviews.sort(byLogDate);

  const pulls = reviews.flatMap((review) =>
    review.pulls.map((pull) => ({
      id:            pull.id,
      reviewId:      review.id,
      reviewLabel:   review.label,
      reviewDate:    (review.reportStartedAt ?? review.addedAt).toISOString(),
      detailed:      review.detailVersion !== null,
      phasesReached: [...new Set(pull.phases.map((p) => p.phase))],
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
        // phase id -> [major, minor] counted errors in that phase.
        byPhase:     phaseCounts(pull.errors.filter((e) =>
          pe.identityId != null ? e.identityId === pe.identityId : e.player === pe.player)),
      })),
    }))
  );

  return NextResponse.json({ pulls, phases: phaseRows });
}

function phaseCounts(errors: { phase: number | null; severity: string }[]): Record<number, [number, number]> {
  const out: Record<number, [number, number]> = {};
  for (const e of errors) {
    if (e.phase === null) continue;
    const c = (out[e.phase] ??= [0, 0]);
    if (e.severity === "Major") c[0] += 1; else c[1] += 1;
  }
  return out;
}
