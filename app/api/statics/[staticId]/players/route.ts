// app/api/statics/[staticId]/players/route.ts
//
// Lists every canonical player identity for a static with its aliases (raw
// log names it's been seen under) — backs the merge UI on the static
// dashboard. Job/color info lives in chart-data instead (that's the only
// consumer that needs it).

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

  const identities = await prisma.staticPlayerIdentity.findMany({
    where:   { staticId },
    orderBy: { name: "asc" },
    include: { aliases: { select: { name: true } } },
  });

  const players = identities.map((identity) => ({
    id:      identity.id,
    name:    identity.name,
    aliases: identity.aliases.map((a) => a.name),
  }));

  return NextResponse.json({ players });
}
