// app/api/waymarks/route.ts
//
// The signed-in user's waymark presets and default for one fight's replay
// (UserWaymarkPreset / UserWaymarkDefault; lib/replay/waymarks.ts).
//   GET    ?fight=<key>          -> { signedIn, presets: [{ name, marks, mapId }], defaultChoice }
//   POST   { fight, name, marks, mapId }  saves a preset (same name replaces it)
//   DELETE ?fight=<key>&name=<n> removes one, and the default if it pointed there
//   PUT    { fight, choice }     sets the default: a built-in preset's name,
//                                "mine:<name>" or "off"; null clears it
// Signed out, GET answers with no presets and writes are refused.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FIGHT_REPLAYS } from "@/lib/replay/fights";
import { cleanMarks, MAX_PRESET_NAME, MINE_PREFIX } from "@/lib/replay/waymarks";

const MAX_PRESETS_PER_FIGHT = 50;

function fightFor(key: unknown) {
  return typeof key === "string" ? FIGHT_REPLAYS.find((f) => f.game === "ffxiv" && f.key === key) ?? null : null;
}

function cleanName(raw: unknown): string | null {
  const name = typeof raw === "string" ? raw.trim() : "";
  return name && name.length <= MAX_PRESET_NAME ? name : null;
}

export async function GET(req: NextRequest) {
  const fight = fightFor(req.nextUrl.searchParams.get("fight"));
  if (!fight) return NextResponse.json({ error: "Unknown fight" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ signedIn: false, presets: [], defaultChoice: null });

  const [presets, def] = await Promise.all([
    prisma.userWaymarkPreset.findMany({ where: { userId: user.id, fightKey: fight.key }, orderBy: { name: "asc" } }),
    prisma.userWaymarkDefault.findUnique({ where: { userId_fightKey: { userId: user.id, fightKey: fight.key } } }),
  ]);
  return NextResponse.json({
    signedIn: true,
    presets: presets.map((p) => ({ name: p.name, marks: p.marks, mapId: p.mapId })),
    defaultChoice: def?.choice ?? null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save waymark presets" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const fight = fightFor(body?.fight);
  const name = cleanName(body?.name);
  const marks = cleanMarks(body?.marks);
  if (!fight) return NextResponse.json({ error: "Unknown fight" }, { status: 400 });
  if (!name) return NextResponse.json({ error: `Name must be 1-${MAX_PRESET_NAME} characters` }, { status: 400 });
  if (!marks) return NextResponse.json({ error: "Those waymarks aren't valid" }, { status: 400 });
  const mapId = Number.isInteger(body?.mapId) ? body.mapId as number : null;

  const where = { userId_fightKey_name: { userId: user.id, fightKey: fight.key, name } };
  const exists = await prisma.userWaymarkPreset.findUnique({ where });
  if (!exists && await prisma.userWaymarkPreset.count({ where: { userId: user.id, fightKey: fight.key } }) >= MAX_PRESETS_PER_FIGHT) {
    return NextResponse.json({ error: `You can keep up to ${MAX_PRESETS_PER_FIGHT} presets per fight. Delete one first.` }, { status: 400 });
  }
  await prisma.userWaymarkPreset.upsert({
    where,
    create: { userId: user.id, fightKey: fight.key, name, marks, mapId },
    update: { marks, mapId },
  });
  return NextResponse.json({ ok: true, replaced: !!exists });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const fight = fightFor(req.nextUrl.searchParams.get("fight"));
  const name = cleanName(req.nextUrl.searchParams.get("name"));
  if (!fight || !name) return NextResponse.json({ error: "Unknown preset" }, { status: 400 });

  await prisma.userWaymarkPreset.deleteMany({ where: { userId: user.id, fightKey: fight.key, name } });
  await prisma.userWaymarkDefault.deleteMany({ where: { userId: user.id, fightKey: fight.key, choice: MINE_PREFIX + name } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to set a default" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const fight = fightFor(body?.fight);
  if (!fight) return NextResponse.json({ error: "Unknown fight" }, { status: 400 });
  const key = { userId_fightKey: { userId: user.id, fightKey: fight.key } };

  const choice = body?.choice;
  if (choice === null) {
    await prisma.userWaymarkDefault.deleteMany({ where: { userId: user.id, fightKey: fight.key } });
    return NextResponse.json({ ok: true });
  }
  let valid = false;
  if (choice === "off") valid = true;
  else if (typeof choice === "string" && choice.startsWith(MINE_PREFIX)) {
    const name = cleanName(choice.slice(MINE_PREFIX.length));
    valid = !!name && !!await prisma.userWaymarkPreset.findUnique({ where: { userId_fightKey_name: { userId: user.id, fightKey: fight.key, name } } });
  } else if (typeof choice === "string") {
    valid = (fight.waymarkPresets ?? []).some((p) => p.name === choice);
  }
  if (!valid) return NextResponse.json({ error: "That waymark choice isn't available for this fight" }, { status: 400 });

  await prisma.userWaymarkDefault.upsert({ where: key, create: { userId: user.id, fightKey: fight.key, choice }, update: { choice } });
  return NextResponse.json({ ok: true });
}
