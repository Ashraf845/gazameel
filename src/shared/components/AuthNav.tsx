"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { getAvatarUrl } from "@/features/auth/user-display";
import type { User } from "@supabase/supabase-js";

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data: authData } = await supabase.auth.getUser();
        if (!cancelled) setUser(authData.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    loadUser();
    const supabase = createClient();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    try {
      sessionStorage.removeItem("gazameel-welcome-seen");
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="border border-[var(--accent-gold)] px-2.5 py-1 text-xs text-[var(--text-primary)] rounded-[4px] hover:bg-[color-mix(in_srgb,var(--accent-gold)_12%,transparent)]"
      >
        دخول
      </Link>
    );
  }

  const avatar = getAvatarUrl(user);

  return (
    <div className="flex items-center gap-2 mr-1">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--accent-gold)]/40"
          referrerPolicy="no-referrer"
          title={user.email ?? undefined}
        />
      ) : (
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-gold)_20%,transparent)] text-xs font-bold text-[var(--accent-gold)]"
          title={user.email ?? undefined}
        >
          {(user.email || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <button type="button" onClick={signOut} className="btn-ghost py-1 px-2 text-xs">
        خروج
      </button>
    </div>
  );
}
