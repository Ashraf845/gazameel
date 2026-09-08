"use client";

/**
 * دخول / قائمة بروفايل عند الضغط على الصورة
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/shared/lib/supabase/client";
import { getAvatarUrl, getDisplayName } from "@/features/auth/user-display";
import { NavPendingHint } from "@/shared/components/NavPendingHint";
import { subscribeClientAuth } from "@/features/auth/client-session";
import type { User } from "@supabase/supabase-js";

type ProfileInfo = {
  full_name: string | null;
  student_id: string | null;
  is_admin: boolean;
  onboarding_done: boolean;
  telegram_chat_id: string | null;
};

export function AuthNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeClientAuth(({ user: nextUser, profile: nextProfile }) => {
      setUser(nextUser);
      setProfile(nextProfile);
    });
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      sessionStorage.removeItem("gazameel-welcome-seen");
      const supabase = createClient();
      await Promise.race([
        Promise.allSettled([
          supabase
            ? supabase.auth.signOut({ scope: "local" })
            : Promise.resolve(),
          fetch("/api/auth/signout", {
            method: "POST",
            signal: AbortSignal.timeout(4000),
          }),
        ]),
        new Promise((r) => setTimeout(r, 4500)),
      ]);
    } catch {
      /* نكمّل للرئيسية حتى لو الشبكة علقت */
    }
    window.location.replace("/");
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
  const name = getDisplayName(user, { full_name: profile?.full_name });
  const email = user.email ?? "";

  return (
    <div className="relative mr-1" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full outline-none ring-[var(--accent-gold)]/40 focus-visible:ring-2"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="حسابي"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--accent-gold)]/40"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-gold)_20%,transparent)] text-sm font-bold text-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/40">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover ring-1 ring-[var(--accent-gold)]/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-gold)_20%,transparent)] text-lg font-bold text-[var(--accent-gold)]">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {name}
                </p>
                {email ? (
                  <p className="truncate text-xs text-[var(--text-secondary)]">{email}</p>
                ) : null}
                {profile?.student_id ? (
                  <p className="mt-0.5 text-xs text-[var(--accent-gold)]">
                    رقم جامعي: {profile.student_id}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="py-1 text-sm">
            {!profile?.onboarding_done ? (
              <MenuLink href="/onboarding" onNavigate={() => setOpen(false)}>
                أكمل التسجيل
              </MenuLink>
            ) : null}
            <MenuLink href="/progress" onNavigate={() => setOpen(false)}>
              تقدّمي
            </MenuLink>
            <MenuLink href="/my-submissions" onNavigate={() => setOpen(false)}>
              مساهماتي
            </MenuLink>
            <MenuLink href="/inbox" onNavigate={() => setOpen(false)}>
              صندوق الرسائل
            </MenuLink>
            <MenuLink href="/telegram" onNavigate={() => setOpen(false)}>
              {profile?.telegram_chat_id ? "تيليجرام (مرتبط)" : "ربط تيليجرام"}
            </MenuLink>
            <MenuLink href="/upload" onNavigate={() => setOpen(false)}>
              ساهم بملخص
            </MenuLink>
            {profile?.is_admin ? (
              <MenuLink href="/admin" onNavigate={() => setOpen(false)}>
                لوحة الأدمن
              </MenuLink>
            ) : null}
          </nav>

          <div className="border-t border-[var(--border)] p-2">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={busy}
              className="w-full rounded px-3 py-2 text-right text-sm text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent-gold)_8%,transparent)] hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              {busy ? "جارٍ الخروج…" : "خروج"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-4 py-2 text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--accent-gold)_8%,transparent)] hover:text-[var(--accent-gold)]"
    >
      {children}
      <NavPendingHint />
    </Link>
  );
}
