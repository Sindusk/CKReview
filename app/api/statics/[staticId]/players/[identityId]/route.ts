// app/api/statics/[staticId]/players/[identityId]/route.ts
//
// Renames a canonical player identity's display name (e.g. after merging
// "Salty Dango" into "Kup'o Noodles", pick which one the chart should show
// going forward) — doesn't touch aliases, just the label.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ staticId: string; identityId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { staticId: staticIdRaw, identityId: identityIdRaw } = await params;
  const staticId = Number(staticIdRaw);
  const identityId = Number(identityIdRaw);
  if (!Number.isInteger(staticId) || !Number.isInteger(identityId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await prisma.staticMember.findUnique({
    where: { staticId_userId: { staticId, userId: user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member of this static" }, { status: 403 });

  const identity = await prisma.staticPlayerIdentity.findUnique({ where: { id: identityId } });
  if (!identity || identity.staticId !== staticId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const updated = await prisma.staticPlayerIdentity.update({
    where: { id: identityId },
    data:  { name },
  });

  return NextResponse.json({ player: updated });
}
