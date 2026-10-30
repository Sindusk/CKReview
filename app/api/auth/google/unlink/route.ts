// app/api/auth/google/unlink/route.ts
//
// Removes the Google account from the logged-in account. Refused while the
// account has no PIN, since that would leave no way to log in.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { usersPool } from "@/lib/usersDb";
import { GOOGLE_PROVIDER, googleEmailForUser } from "@/lib/google-auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const result = await usersPool.query(
    `DELETE FROM auth_identity
     WHERE user_id = $1 AND provider = $2
       AND EXISTS (SELECT 1 FROM app_user WHERE id = $1 AND pin_hash IS NOT NULL)`,
    [user.id, GOOGLE_PROVIDER],
  );
  if (result.rowCount === 0) {
    const linked = (await googleEmailForUser(user.id)) != null;
    return NextResponse.json(
      { error: linked ? "Set a PIN before unlinking Google" : "No Google account is linked" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
