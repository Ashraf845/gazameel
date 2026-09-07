"use client";

import { useState } from "react";

/**
 * يطلب Signed URL من السيرفر ثم يفتحه في تبويب جديد.
 * المسار: GET /api/resources/[id]/download
 */
export function DownloadButton({ resourceId }: { resourceId: string }) {
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
        } else {
          setErr(data.error || "تعذّر التنزيل");
        }
        return;
      }
      if (data.url) window.open(data.url, "_blank");
      else setErr("لم يُرجع السيرفر رابطًا");
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
        {loading ? "…" : "معاينة / تنزيل"}
      </button>
      {err && <p className="text-xs text-[#e07a7a] mt-1 max-w-[14rem]">{err}</p>}
    </div>
  );
}
