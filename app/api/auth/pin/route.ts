// app/api/auth/pin/route.ts
//
// Turns the logged-in account's PIN off or back on.
//   { action: "disable" } — only with Google linked, so the account always
//     keeps a way in. pin_hash becomes NULL: PIN login stops working on
//     every app sharing the users database.
//   { action: "set", pin } — only while there is no PIN (a Google-created
//     account, or one that turned it off). Changing an existing PIN is not
//     offered here.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPin } from "@/lib/auth";
import { usersPool } from "@/lib/usersDb";
import { googleEmailForUser } from "@/lib/google-auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (body?.action === "disable") {
    if ((await googleEmailForUser(user.id)) == null) {
      return NextResponse.json({ error: "Link a Google account before turning the PIN off" }, { status: 409 });
    }
    await usersPool.query("UPDATE app_user SET pin_hash = NULL WHERE id = $1", [user.id]);
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "set") {
    const pin = String(body?.pin || "");
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    const pinHash = await hashPin(pin);
    const updated = await usersPool.query(
      "UPDATE app_user SET pin_hash = $2 WHERE id = $1 AND pin_hash IS NULL",
      [user.id, pinHash],
    );
    if (updated.rowCount === 0) {
      return NextResponse.json({ error: "This account already has a PIN" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
