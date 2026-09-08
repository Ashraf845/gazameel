"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import { BRAND } from "@/shared/lib/constants";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "فشل تسجيل الدخول — تأكد Redirect URL في Supabase.",
  supabase_config: "مفاتيح Supabase غير مضبوطة — راجع .env.local وأعد npm run dev.",
  exchange: "محاولة دخول ثانية فشلت — لكن قد تكون مسجّلًا أصلًا.",
};

function destAfterLogin(onboardingDone: boolean, next: string | null) {
  if (!onboardingDone) return "/onboarding";
  if (next && next.startsWith("/")) return next;
  return "/hub";
}

function nextAfterLogin(searchParams: URLSearchParams) {
  const next = searchParams.get("next");
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return "/hub";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const errorCode = searchParams.get("error");
  const error = errorCode ? ERROR_MESSAGES[errorCode] ?? null : null;
  const detail = searchParams.get("detail");

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const supabase = createClient();
        if (!supabase) {
          setChecking(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_done")
            .eq("id", session.user.id)
            .maybeSingle();

          window.location.replace(
            destAfterLogin(!!profile?.onboarding_done, searchParams.get("next"))
          );
          return;
        }
      } catch {
        /* continue to login form */
      }
      setChecking(false);
    }

    checkExistingSession();
  }, [searchParams]);

  async function startGoogle() {
    if (starting) return;
    setStarting(true);
    const next = nextAfterLogin(searchParams);
    const fallback = `/api/auth/google?next=${encodeURIComponent(next)}`;
    try {
      const supabase = createClient();
      if (!supabase) {
        window.location.assign(fallback);
        return;
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) window.location.assign(fallback);
    } catch {
      window.location.assign(fallback);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-[var(--text-secondary)]">
        جاري التحقق…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">دخول {BRAND}</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
        سجّل بحساب Google ثم أدخل رقمك الجامعي.
      </p>

      <button
        type="button"
        onClick={startGoogle}
        disabled={starting}
        className="btn-primary block w-full text-center disabled:opacity-60"
      >
        {starting ? "جارٍ التحويل إلى Google…" : "دخول عبر Google"}
      </button>

      {error && (
        <div className="mt-4 text-sm text-[#e07a7a] space-y-2">
          <p>{error}</p>
          {detail && (
            <p className="text-[var(--text-secondary)] text-xs break-all">{detail}</p>
          )}
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
            إذا ظهر اسمك في الهيدر فأنت مسجّل —{" "}
            <Link href="/hub" className="text-[var(--accent-gold)] underline">
              ادخل المكتبة
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-[var(--text-secondary)]">جاري التحميل…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
