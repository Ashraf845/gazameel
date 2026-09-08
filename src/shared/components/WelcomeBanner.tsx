"use client";

/**
 * ترحيب قصير بعد تسجيل الدخول — يظهر مرة ثم يختفي
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeClientAuth } from "@/features/auth/client-session";
import { getAvatarUrl, getDisplayName } from "@/features/auth/user-display";
import type { User } from "@supabase/supabase-js";

const STORAGE_KEY = "gazameel-welcome-seen";

export function WelcomeBanner() {
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

    let cancelled = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeClientAuth(({ user: u, profile }) => {
      if (cancelled || !u) return;
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

      setUser(u);
      setProfileName(profile?.full_name ?? null);
      setNeedsOnboarding(!profile?.onboarding_done);
      setVisible(true);
      sessionStorage.setItem(STORAGE_KEY, "1");

      hideTimer = setTimeout(
        () => {
          if (!cancelled) setVisible(false);
        },
        profile?.onboarding_done ? 4500 : 9000
      );
    });

    return () => {
      cancelled = true;
      unsub();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible || !user) return null;

  const name = getDisplayName(user, { full_name: profileName });
  const avatar = getAvatarUrl(user);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="card-soft flex flex-wrap items-center gap-4 p-4 md:p-5 animate-[fadeIn_0.35s_ease]">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-[var(--accent-gold)]/50"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-gold)_18%,transparent)] text-lg font-bold text-[var(--accent-gold)]">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            مرحبًا، {name}
          </p>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {needsOnboarding
              ? "أكمل تسجيلك (رقم جامعي + مواد) للمتابعة."
              : "تم تسجيل دخولك — استكشف المكتبة أو ساهم بملخص."}
          </p>
        </div>
        {needsOnboarding ? (
          <Link href="/onboarding" className="btn-primary text-sm shrink-0">
            أكمل التسجيل
          </Link>
        ) : null}
        <button
          type="button"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-gold)]"
          onClick={() => setVisible(false)}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
