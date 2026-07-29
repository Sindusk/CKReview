// app/api/statics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const memberships = await prisma.staticMember.findMany({
    where:   { userId: user.id },
    include: { static: true },
    orderBy: { static: { name: "asc" } },
  });

  const statics = memberships.map(m => ({
    id:        m.static.id,
    name:      m.static.name,
    createdAt: m.static.createdAt,
    role:      m.role,
  }));

  return NextResponse.json({ statics });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json();
  const name = String(body?.name || "").trim();
  if (!name || name.length > 64) {
    return NextResponse.json({ error: "Name must be 1-64 characters" }, { status: 400 });
  }

  const created = await prisma.static.create({
    data: { name, createdByUserId: user.id },
  });

  await prisma.staticMember.create({
    data: { staticId: created.id, userId: user.id, role: "OWNER" },
  });

  return NextResponse.json({
    static: { id: created.id, name: created.name, createdAt: created.createdAt, role: "OWNER" },
  });
}
