"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSES } from "@/shared/lib/courses";
import { createClient } from "@/shared/lib/supabase/client";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function skipIfDone() {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/onboarding");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_done")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.onboarding_done) router.replace("/hub");
    }
    skipIfDone();
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const course_codes = fd.getAll("courses").map(String);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fd.get("full_name"),
        student_id: fd.get("student_id"),
        major: fd.get("major"),
        course_codes,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ — سجّل الدخول أولًا");
      return;
    }
    router.push("/hub");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">تسجيل طالب</h1>
      <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
        بعد{" "}
        <Link href="/login" className="text-[var(--accent-gold)] underline">
          دخول Google
        </Link>
        ، أدخل رقمك الجامعي وموادك مرة واحدة. الرقم مُصرَّح به منك (ليس تحقق رسمي من الجامعة).
      </p>

      <form onSubmit={onSubmit} className="card-soft space-y-4 p-6">
        <label className="block text-sm">
          الاسم الكامل
          <input
            name="full_name"
            required
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          الرقم الجامعي
          <input
            name="student_id"
            required
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          التخصص
          <input
            name="major"
            required
            placeholder="هندسة حاسوب"
            className="mt-1 w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2"
          />
        </label>

        <fieldset className="text-sm">
          <legend className="mb-2">موادي الحالية</legend>
          <div className="space-y-2">
            {COURSES.map((c) => (
              <label key={c.code} className="flex gap-2 items-center">
                <input type="checkbox" name="courses" value={c.code} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex gap-2 text-sm items-start">
          <input type="checkbox" required className="mt-1" />
          أوافق على أن المنصة غير رسمية ولا تتبع إدارة الجامعة.
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جاري الحفظ…" : "حفظ ومتابعة"}
        </button>
        {error && <p className="text-sm text-[#e07a7a]">{error}</p>}
      </form>
    </div>
  );
}
