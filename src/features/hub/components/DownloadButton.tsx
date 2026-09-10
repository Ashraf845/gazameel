"use client";

/**
 * يطلب Signed URL ثم ينزّل الملف.
 * على Safari لا نجلب Blob عبر fetch (قيود CORS) — نوجّه مباشرة لرابط التوقيع
 * مع Content-Disposition: attachment من Supabase.
 */
import { useState } from "react";

export function DownloadButton({
  resourceId,
  title,
}: {
  resourceId: string;
  title?: string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/resources/${resourceId}/download`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          setErr(data.error || "قاعدة البيانات غير مُعدّة — راجع .env.local");
        } else if (res.status === 401) {
          setErr("سجّل الدخول أولًا لتنزيل الملف");
        } else if (
          res.status === 403 &&
          (data.code === "ONBOARDING_REQUIRED" ||
            String(data.error || "").includes("أكمل التسجيل"))
        ) {
          setErr("أكمل التسجيل أولًا لتنزيل الملفات");
          window.setTimeout(() => {
            window.location.href = "/onboarding?next=" + encodeURIComponent(window.location.pathname);
          }, 900);
        } else {
          setErr(data.error || "تعذّر التنزيل");
        }
        return;
      }
      if (!data.url) {
        setErr("لم يُرجع السيرفر رابطًا");
        return;
      }

      if (data.type === "external") {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }

      const filename =
        data.filename ||
        `${(title || "gazameel").replace(/[\\/:*?"<>|]+/g, "_")}.pdf`;

      // رابط موقّع مع download= — يعمل على Chrome وSafari بدون fetch Blob
      const a = document.createElement("a");
      a.href = data.url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setErr("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={download}
        className="btn-primary text-sm"
        disabled={loading}
      >
        {loading ? "جارٍ التنزيل…" : "تنزيل الملف"}
      </button>
      {err && (
        <p className="mt-1 max-w-[14rem] text-xs text-[#e07a7a]">{err}</p>
      )}
    </div>
  );
}
