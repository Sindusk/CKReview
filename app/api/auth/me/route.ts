// app/api/auth/me/route.ts
//
// Who's logged in, plus the sign-in methods on the account (for
// components/AccountDialog.tsx) and whether Google sign-in is configured.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { usersPool } from "@/lib/usersDb";
import { googleConfigured, googleEmailForUser } from "@/lib/google-auth";

export async function GET() {
  const googleEnabled = googleConfigured();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null, googleEnabled });

  const [pin, googleEmail] = await Promise.all([
    usersPool.query("SELECT pin_hash IS NOT NULL AS has_pin FROM app_user WHERE id = $1", [user.id]),
    googleEmailForUser(user.id),
  ]);

  return NextResponse.json({
    user: {
      username:    user.username,
      role:        user.role,
      hasPin:      Boolean(pin.rows[0]?.has_pin),
      googleEmail,
    },
    googleEnabled,
  });
}
