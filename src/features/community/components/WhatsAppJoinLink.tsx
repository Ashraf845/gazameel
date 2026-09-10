"use client";

/**
 * روابط قناة واتساب — تظهر فقط بعد إكمال التسجيل.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadClientAuth } from "@/features/auth/client-session";

function isRealUrl(val?: string | null) {
  if (!val?.trim()) return false;
  return !/YOUR_|placeholder|change-me|example/i.test(val);
}

export function WhatsAppJoinLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<"loading" | "ok" | "need" | "guest">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    loadClientAuth()
      .then(({ user, profile }) => {
        if (cancelled) return;
        if (!user) setState("guest");
        else if (profile?.onboarding_done || profile?.is_admin) setState("ok");
        else setState("need");
      })
      .catch(() => {
        if (!cancelled) setState("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isRealUrl(href)) return null;

  if (state === "loading") {
    return (
      <span className="text-sm text-[var(--text-secondary)]">…</span>
    );
  }

  if (state === "ok") {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  const next = "/onboarding?next=/about";
  return (
    <Link
      href={state === "guest" ? `/login?next=${encodeURIComponent(next)}` : next}
      className={className}
    >
      {state === "guest" ? "سجّل الدخول للمتابعة" : "أكمل التسجيل للمتابعة"}
    </Link>
  );
}
