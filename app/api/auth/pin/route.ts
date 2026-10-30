// app/api/auth/pin/route.ts
//
// Turns the logged-in account's PIN off or back on.
//   { action: "disable" } — only with Google linked, so the account always
//     keeps a way in. pin_hash becomes NULL: PIN login stops working on
//     every app sharing the users database.
//   { action: "set", pin } — only while there is no PIN (a Google-created
//     account, or one that turned it off). Changing an existing PIN is not
//     offered here.
// Both run under the account row lock (withAccountLocked), so turning the
// PIN off can't race a Google unlink into leaving no sign-in method.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPin, rejectCrossSite } from "@/lib/auth";
import { withAccountLocked } from "@/lib/usersDb";
import { GOOGLE_PROVIDER } from "@/lib/google-auth";

export async function POST(req: NextRequest) {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (body?.action === "disable") {
    const error = await withAccountLocked(user.id, async client => {
      const google = await client.query(
        "SELECT 1 FROM auth_identity WHERE user_id = $1 AND provider = $2",
        [user.id, GOOGLE_PROVIDER],
      );
      if (google.rowCount === 0) return "Link a Google account before turning the PIN off";
      await client.query("UPDATE app_user SET pin_hash = NULL WHERE id = $1", [user.id]);
      return null;
    });
    if (error) return NextResponse.json({ error }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "set") {
    const pin = String(body?.pin || "");
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    // Hashed outside the lock: scrypt is deliberately slow.
    const pinHash = await hashPin(pin);
    const set = await withAccountLocked(user.id, async (client, currentHash) => {
      if (currentHash) return false;
      await client.query("UPDATE app_user SET pin_hash = $2 WHERE id = $1", [user.id, pinHash]);
      return true;
    });
    if (!set) return NextResponse.json({ error: "This account already has a PIN" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
