// app/api/wow-map/[id]/route.ts
//
// Calibration of one WoW zone's map art for the replay (lib/wow-map-art.ts):
// where the image sits in log units. The image itself is ./image. The first
// request for a map builds it from wago.tools (~15 requests); after that it
// is read from data/wow-maps/.

import { NextRequest, NextResponse } from "next/server";
import { getWowMapArt } from "@/lib/wow-map-art";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid map id" }, { status: 400 });
  try {
    const { meta } = await getWowMapArt(id);
    return NextResponse.json(meta);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
