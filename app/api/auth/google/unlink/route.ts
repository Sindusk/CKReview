// app/api/auth/google/unlink/route.ts
//
// Removes the Google account from the logged-in account. Refused while the
// account has no PIN, since that would leave no way to log in; checked and
// changed under the account row lock (withAccountLocked) so it can't race
// turning the PIN off.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, rejectCrossSite } from "@/lib/auth";
import { withAccountLocked } from "@/lib/usersDb";
import { GOOGLE_PROVIDER } from "@/lib/google-auth";

export async function POST(req: NextRequest) {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const error = await withAccountLocked(user.id, async (client, pinHash) => {
    if (!pinHash) return "Set a PIN before unlinking Google";
    const deleted = await client.query(
      "DELETE FROM auth_identity WHERE user_id = $1 AND provider = $2",
      [user.id, GOOGLE_PROVIDER],
    );
    return deleted.rowCount === 0 ? "No Google account is linked" : null;
  });
  if (error) return NextResponse.json({ error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
