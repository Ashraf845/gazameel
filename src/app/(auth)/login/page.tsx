"use client";

import { Suspense, useEffect, useState } from "react";
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

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

  useEffect(() => {
    if (checking) return;
    const code = searchParams.get("error");
    if (code && ERROR_MESSAGES[code]) setError(ERROR_MESSAGES[code]);
    setDetail(searchParams.get("detail"));
  }, [searchParams, checking]);

  async function signInGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError(ERROR_MESSAGES.supabase_config);
        setLoading(false);
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

      const origin = window.location.origin;
      const next = searchParams.get("next") || "";
      if (next.startsWith("/")) {
        try {
          sessionStorage.setItem("gazameel_next", next);
        } catch {
          /* */
        }
      }
      const redirectTo = `${origin}/auth/confirm`;
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("لم يُرجع Supabase رابط Google");
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
      setLoading(false);
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
        onClick={signInGoogle}
        disabled={loading}
        className="btn-primary w-full text-center"
      >
        {loading ? "جاري التحويل…" : "دخول عبر Google"}
      </button>

      {error && (
        <div className="mt-4 text-sm text-[#e07a7a] space-y-2">
          <p>{error}</p>
          {detail && (
            <p className="text-[var(--text-secondary)] text-xs break-all hidden">{detail}</p>
          )}
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
            إذا ظهر اسمك في الهيدر فأنت مسجّل —{" "}
            <a href="/hub" className="text-[var(--accent-gold)] underline">
              ادخل المكتبة
            </a>
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
