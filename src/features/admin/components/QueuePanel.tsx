"use client";

import { useCallback, useEffect, useState } from "react";

type PendingItem = {
  id: string;
  title: string;
  created_at: string;
  contributor_display_name: string | null;
  preview_url: string | null;
  courses: { code: string; name_ar: string } | null;
  profiles: { full_name: string | null; student_id: string | null } | null;
};

export function QueuePanel({ dbReady }: { dbReady: boolean }) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(
    dbReady ? null : "طابور المراجعة يحتاج إعداد Supabase في .env.local."
  );

  const load = useCallback(async () => {
    if (!dbReady) {
      setSetupHint("طابور المراجعة يحتاج إعداد Supabase في .env.local.");
      setItems([]);
      return;
    }
    const res = await fetch("/api/admin/submissions");
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) {
      setSetupHint(data.error || "قاعدة البيانات غير مُعدّة بعد.");
      setItems([]);
      return;
    }
    setSetupHint(null);
    if (res.ok) setItems(data.items || []);
    else setMsg(data.error || "تعذّر تحميل الطابور");
  }, [dbReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("سبب الرفض (اختياري):") || undefined;
    }
    const res = await fetch("/api/admin/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    const data = await res.json();
    setMsg(res.ok ? `تم: ${action}` : data.error);
    load();
  }

  return (
    <div className="card-soft space-y-4 p-5">
      {setupHint && (
        <p className="text-sm leading-relaxed text-[var(--warn)]">{setupHint}</p>
      )}
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {!setupHint && !items.length && (
        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
          لا مساهمات معلّقة
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="space-y-2 rounded-lg border border-[var(--border)] p-4"
        >
          <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
          <div className="text-sm text-[var(--text-secondary)]">
            {item.courses?.name_ar} · {item.contributor_display_name} ·{" "}
            {item.profiles?.student_id}
          </div>
          {item.preview_url && (
            <a
              href={item.preview_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-gold)] underline"
            >
              معاينة (رابط موقّت)
            </a>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => review(item.id, "approve")}
            >
              موافقة
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => review(item.id, "reject")}
            >
              رفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
