import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  if (supabase) {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("signout_timeout")), 4000)
        ),
      ]);
    } catch {
      /* حتى لو Supabase علّق نمسح الجلسة من الردّ بالكوكي عبر العميل */
    }
  }
  return NextResponse.json({ ok: true });
}
