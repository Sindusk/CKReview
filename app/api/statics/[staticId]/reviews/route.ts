// app/api/statics/[staticId]/reviews/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { StaticReviewPayload, StaticReviewPullData } from "@/lib/static-review-data";
import { resolvePlayerIdentities } from "@/lib/static-player-identity";
import { parseLogUrl } from "@/lib/url-parsers";

// A 65-pull night writes a few thousand detail rows; the 5 s default
// interactive-transaction timeout is too tight for that.
const IMPORT_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

async function requireMembership(staticId: number, userId: number) {
  return prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId } },
  });
}

/**
 * Upserts the static's rule and phase-name lookups for this payload and
 * returns ruleKey -> StaticRule.id. Labels are refreshed on every import
 * (see lib/mechanics/rule-meta.ts).
 */
async function upsertDetailLookups(
  tx:         Prisma.TransactionClient,
  staticId:   number,
  rules:      StaticReviewPayload["rules"],
  phaseNames: StaticReviewPayload["phaseNames"],
): Promise<Map<string, number>> {
  const ruleIds = new Map<string, number>();
  for (const r of rules) {
    const data = {
      name:          String(r.name),
      mechanicKey:   String(r.mechanicKey),
      mechanicLabel: String(r.mechanicLabel),
      phaseHint:     Number.isInteger(r.phaseHint) ? r.phaseHint : null,
    };
    const row = await tx.staticRule.upsert({
      where:  { staticId_ruleKey: { staticId, ruleKey: String(r.ruleKey) } },
      create: { staticId, ruleKey: String(r.ruleKey), ...data },
      update: data,
      select: { id: true },
    });
    ruleIds.set(r.ruleKey, row.id);
  }
  for (const { bossName, phases } of phaseNames) {
    for (const ph of phases) {
      const data = { name: String(ph.name), isIntermission: !!ph.isIntermission };
      await tx.staticPhase.upsert({
        where:  { staticId_bossName_phaseId: { staticId, bossName, phaseId: ph.id } },
        create: { staticId, bossName, phaseId: ph.id, ...data },
        update: data,
      });
    }
  }
  return ruleIds;
}

function buildPullsCreateData(
  pulls:      StaticReviewPullData[],
  identities: Map<string, number>,
  ruleIds:    Map<string, number>,
) {
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
    lastPhase:       p.lastPhase ?? null,
    endCauseKind:    p.endCause?.kind ?? null,
    endCauseRuleId:  p.endCause?.ruleKey ? ruleIds.get(p.endCause.ruleKey) ?? null : null,
    endCauseAbility: p.endCause?.ability ?? null,
    endCauseAtMs:    p.endCause ? Math.round(p.endCause.atMs) : null,
    endCausePhase:   p.endCause?.phase ?? null,
    errors: {
      createMany: {
        data: (p.errors ?? [])
          .filter((e) => ruleIds.has(e.ruleKey))
          .map((e) => ({
            // Only roster names resolve to an identity; anything else
            // (pets, "Multiple Players") keeps its raw name only.
            identityId:  e.player ? identities.get(e.player) ?? null : null,
            player:      e.player ?? null,
            ruleRefId:   ruleIds.get(e.ruleKey)!,
            severity:    e.severity,
            timestampMs: Math.round(e.timestampMs),
            phase:       e.phase ?? null,
            occurrence:  e.occurrence ?? null,
            afterCutoff: !!e.afterCutoff,
          })),
      },
    },
    phases: {
      createMany: {
        data: (p.phases ?? []).map((s, seq) => ({
          seq, phase: s.phase, startMs: Math.round(s.startMs), endMs: Math.round(s.endMs),
        })),
      },
    },
    mechanics: {
      createMany: {
        data: (p.mechanics ?? []).map((m) => ({
          mechanicKey: m.mechanicKey, occurrence: m.occurrence,
          timestampMs: Math.round(m.timestampMs), phase: m.phase ?? null,
        })),
      },
    },
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
  let pulls: StaticReviewPullData[] = Array.isArray(body?.pulls) ? body.pulls : [];
  // Detail rows (docs/archive/static-player-analysis-plan.md) come only from
  // clients that send a detailVersion; an older client's payload imports
  // counts only and leaves the session undetailed.
  const detailVersion =
    Number.isInteger(body?.detailVersion) && body.detailVersion > 0 ? body.detailVersion as number : null;
  const rules: StaticReviewPayload["rules"] = detailVersion && Array.isArray(body?.rules) ? body.rules : [];
  const phaseNames: StaticReviewPayload["phaseNames"] =
    detailVersion && Array.isArray(body?.phaseNames) ? body.phaseNames : [];
  if (!detailVersion) {
    for (const p of pulls) { delete p.errors; delete p.phases; delete p.mechanics; delete p.endCause; delete p.lastPhase; }
  }

  if (!sessionId || !reportUrl) {
    return NextResponse.json({ error: "sessionId and reportUrl are required" }, { status: 400 });
  }

  // Players deleted from this session in the Players panel (see
  // players/[identityId] DELETE): their pulls stay out on every resync.
  // Filtered before identities resolve, so the deleted names don't return.
  const excluded = new Set((await prisma.staticExcludedPlayer.findMany({
    where:  { staticId, sessionId },
    select: { name: true },
  })).map((e) => e.name));
  if (excluded.size > 0) pulls = pulls.filter((p) => !p.players.some((pl) => excluded.has(pl.player)));
  const allPlayerNames = pulls.flatMap((p) => p.players.map((pl) => pl.player));

  try {
    const review = await prisma.$transaction(async (tx) => {
      const identities = await resolvePlayerIdentities(tx, staticId, allPlayerNames);
      const ruleIds = await upsertDetailLookups(tx, staticId, rules, phaseNames);
      return tx.staticReview.create({
        data: {
          staticId,
          sessionId,
          reportUrl,
          label,
          reportStartedAt,
          detailVersion,
          addedByUserId: user.id,
          pulls: { create: buildPullsCreateData(pulls, identities, ruleIds) },
        },
      });
    }, IMPORT_TX_OPTIONS);
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
        const ruleIds = await upsertDetailLookups(tx, staticId, rules, phaseNames);

        // Cascades to the count rows and every detail row of these pulls.
        await tx.staticReviewPull.deleteMany({ where: { staticReviewId: existing.id } });

        const pullsCreateData = buildPullsCreateData(pulls, identities, ruleIds).map((p) => ({
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
            // The pulls were just rebuilt from this payload, so the detail
            // level is whatever this client sent.
            detailVersion,
            pulls: { create: pullsCreateData },
          },
        });
      }, IMPORT_TX_OPTIONS);
      return NextResponse.json({ review, resynced: true });
    }
    throw err;
  }
}
