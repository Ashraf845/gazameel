"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogCourse } from "@/shared/lib/courses";
import {
  mimeFromFile,
  putFileToSignedUrl,
  readApiError,
  validateUploadFile,
} from "@/features/upload/files";

type Item = {
  id: string;
  title: string;
  status: string;
  resource_type: string;
  created_at: string;
  contributor_display_name: string | null;
  external_url: string | null;
  courses: { code: string; name_ar: string } | null;
};

/** إدارة الملفات المنشورة: حذف واستبدال فوري (أدمن) */
export function ManagedResourcesPanel({
  courses,
  dbReady,
}: {
  courses: CatalogCourse[];
  dbReady: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [course, setCourse] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!dbReady) {
      setItems([]);
      return;
    }
    const q = course ? `?course=${encodeURIComponent(course)}` : "";
    const res = await fetch(`/api/admin/resources${q}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "تعذّر تحميل الملفات");
      return;
    }
    setErr(null);
    setItems(data.items || []);
  }, [course, dbReady]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function onDelete(item: Item) {
    if (busyId) return;
    if (!window.confirm(`حذف «${item.title}» من المكتبة نهائيًا؟`)) return;
    setBusyId(item.id);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/resources/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        setErr(await readApiError(res, "فشل الحذف"));
        return;
      }
      setMsg(`حُذف: ${item.title}`);
      await load();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  async function onReplaceFile(item: Item, file: File) {
    if (busyId) return;
    const localErr = validateUploadFile(file);
    if (localErr) {
      setErr(localErr);
      return;
    }
    setBusyId(item.id);
    setMsg(null);
    setErr(null);
    try {
      const mime = mimeFromFile(file);
      const prepRes = await fetch(`/api/resources/${item.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          mime_type: mime,
          file_size: file.size,
        }),
      });
      if (!prepRes.ok) {
        setErr(await readApiError(prepRes, "فشل التجهيز"));
        return;
      }
      const prep = await prepRes.json();
      const put = await putFileToSignedUrl(prep.signedUrl, file, mime);
      if (!put.ok) {
        setErr(put.error);
        return;
      }
      const doneRes = await fetch(`/api/resources/${item.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          path: prep.path,
          mime_type: mime,
          file_size: file.size,
        }),
      });
      if (!doneRes.ok) {
        setErr(await readApiError(doneRes, "فشل الاستبدال"));
        return;
      }
      const data = await doneRes.json();
      setMsg(data.message || `استُبدل: ${item.title}`);
      await load();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusyId(null);
      const input = fileRefs.current[item.id];
      if (input) input.value = "";
    }
  }

  async function onReplaceVideo(item: Item) {
    if (busyId) return;
    const url = window.prompt("رابط الفيديو الجديد:", item.external_url || "");
    if (!url?.trim()) return;
    setBusyId(item.id);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/resources/${item.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "video",
          external_url: url.trim(),
        }),
      });
      if (!res.ok) {
        setErr(await readApiError(res, "فشل التحديث"));
        return;
      }
      const data = await res.json();
      setMsg(data.message || "تم تحديث الرابط");
      await load();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusyId(null);
    }
  }

  const field =
    "rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]";

  return (
    <div className="card-soft space-y-4 p-5">
      <p className="text-sm text-[var(--text-secondary)]">
        احذف ملفًا منشورًا أو استبدله بملف جديد دون إعادة رفع كمساهمة جديدة.
        الاستبدال من الأدمن يبقى منشورًا فورًا.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={field}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <option value="">كل المواد</option>
          {courses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]"
          onClick={() => void load()}
        >
          تحديث
        </button>
      </div>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {err && <p className="text-sm text-[#e07a7a]">{err}</p>}
      {!dbReady && (
        <p className="text-sm text-[var(--warn)]">يحتاج إعداد Supabase.</p>
      )}
      {dbReady && !items.length && (
        <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
          لا ملفات منشورة{course ? " لهذه المادة" : ""}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-[var(--border)] p-4"
          >
            <div className="font-medium text-[var(--text-primary)]">
              {item.title}
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              {item.courses?.name_ar} · {item.contributor_display_name || "—"} ·{" "}
              {item.resource_type}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-[#e07a7a]/50 px-3 py-1.5 text-sm text-[#e07a7a] disabled:opacity-50"
                disabled={busyId === item.id}
                onClick={() => void onDelete(item)}
              >
                حذف
              </button>
              {item.resource_type === "video" ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-50"
                  disabled={busyId === item.id}
                  onClick={() => void onReplaceVideo(item)}
                >
                  تحديث الرابط
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-50"
                    disabled={busyId === item.id}
                    onClick={() => fileRefs.current[item.id]?.click()}
                  >
                    {busyId === item.id ? "جارٍ…" : "استبدال الملف"}
                  </button>
                  <input
                    ref={(el) => {
                      fileRefs.current[item.id] = el;
                    }}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onReplaceFile(item, f);
                    }}
                  />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
