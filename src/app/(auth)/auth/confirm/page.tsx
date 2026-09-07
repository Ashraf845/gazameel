"use client";

import { Suspense, useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";

async function redirectIfLoggedIn(supabase: ReturnType<typeof createClient>) {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_done")
    .eq("id", session.user.id)
    .maybeSingle();

  let next: string | null = null;
  try {
    next = sessionStorage.getItem("gazameel_next");
    sessionStorage.removeItem("gazameel_next");
  } catch {
    /* */
  }
  if (!profile?.onboarding_done) {
    window.location.replace("/onboarding");
  } else if (next && next.startsWith("/")) {
    window.location.replace(next);
  } else {
    window.location.replace("/hub");
  }
  return true;
}

function ConfirmInner() {
  useEffect(() => {
    let done = false;

    const timeout = window.setTimeout(() => {
      if (!done) {
        window.location.replace("/login?error=exchange&detail=timeout");
      }
    }, 30000);

    async function finishLogin() {
      const supabase = createClient();
      if (!supabase) {
        done = true;
        clearTimeout(timeout);
        window.location.replace("/login?error=supabase_config");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          done = true;
          clearTimeout(timeout);
          if (!(await redirectIfLoggedIn(supabase))) {
            window.location.replace("/onboarding");
          }
          return;
        }

        // فشل التبديل — لكن الجلسة قد تكون موجودة من محاولة سابقة
        if (await redirectIfLoggedIn(supabase)) {
          done = true;
          clearTimeout(timeout);
          return;
        }

        done = true;
        clearTimeout(timeout);
        window.location.replace(
          `/login?error=exchange&detail=${encodeURIComponent(error.message)}`
        );
        return;
      }

      if (window.location.hash.includes("access_token")) {
        await new Promise((r) => setTimeout(r, 500));
        if (await redirectIfLoggedIn(supabase)) {
          done = true;
          clearTimeout(timeout);
          return;
        }
      }

      if (await redirectIfLoggedIn(supabase)) {
        done = true;
        clearTimeout(timeout);
        return;
      }

      done = true;
      clearTimeout(timeout);
      window.location.replace("/login?error=auth");
    }

    finishLogin();

    return () => {
      done = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center text-[var(--text-secondary)]">
      جاري إتمام الدخول…
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-[var(--text-secondary)]">
          جاري التحميل…
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
