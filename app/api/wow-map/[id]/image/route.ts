// app/api/wow-map/[id]/image/route.ts — one WoW zone's map art as a PNG
// (lib/wow-map-art.ts); its calibration is the parent route.

import { NextRequest, NextResponse } from "next/server";
import { getWowMapArt } from "@/lib/wow-map-art";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid map id" }, { status: 400 });
  try {
    const { png } = await getWowMapArt(id);
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
