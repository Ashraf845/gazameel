"use client";

import { useState } from "react";
import {
  MAX_FILE_BYTES,
  MAX_PENDING_PER_USER,
} from "@/shared/lib/constants";
import { COURSES, RESOURCE_TYPES } from "@/shared/lib/courses";
import { FileDropZone } from "@/shared/components/FileDropZone";
import {
  mimeFromFile,
  putFileToSignedUrl,
  readApiError,
  validateUploadFile,
} from "@/features/upload/files";
import Link from "next/link";

/**
 * رفع الطالب: prepare → رفع مباشر لـ Supabase → complete
 * يتجاوز حد Vercel 4.5MB حتى يمكن رفع ملفات حتى 15MB.
 */
export default function UploadPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setMessage(null);
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File | null;
    const course = String(fd.get("course") || "");
    const title = String(fd.get("title") || "").trim();
    const contributor = String(fd.get("contributor") || "").trim();
    const resourceType = String(fd.get("resource_type") || "summary");

    const localErr = validateUploadFile(file);
    if (localErr) {
      setError(localErr);
      return;
    }
    if (!title || !course) {
      setError("العنوان والمادة مطلوبان.");
      return;
    }

    const mime = mimeFromFile(file!);
    setLoading(true);
    try {
      setProgress("جارٍ تجهيز الرفع…");
      const prepRes = await fetch("/api/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          title,
          contributor,
          resource_type: resourceType,
          mime_type: mime,
          file_size: file!.size,
        }),
      });
      if (!prepRes.ok) {
        setError(await readApiError(prepRes, "فشل تجهيز الرفع"));
        return;
      }
      const prep = await prepRes.json();

      setProgress("جارٍ رفع الملف…");
      const put = await putFileToSignedUrl(prep.signedUrl, file!, mime);
      if (!put.ok) {
        setError(put.error);
        return;
      }

      setProgress("جارٍ حفظ البيانات…");
      const doneRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: prep.path,
          course,
          title,
          contributor,
          resource_type: resourceType,
          mime_type: mime,
          file_size: file!.size,
        }),
      });
      if (!doneRes.ok) {
        setError(await readApiError(doneRes, "فشل حفظ الملف"));
        return;
      }
      const done = await doneRes.json();
      setMessage(done.message || "تم الإرسال للمراجعة");
      form.reset();
    } catch {
      setError("فشل الاتصال بالخادم — تحقق من الشبكة وأعد المحاولة");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const maxMb = Math.round(MAX_FILE_BYTES / (1024 * 1024));
  const field =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
        ساهم بملف
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
        يلزم{" "}
        <Link href="/login" className="text-[var(--accent-gold)] underline">
          تسجيل الدخول
        </Link>{" "}
        وإكمال التسجيل. الحد {maxMb} ميجابايت — حتى {MAX_PENDING_PER_USER}{" "}
        ملفات قيد المراجعة.
      </p>

      <form onSubmit={onSubmit} className="card-soft space-y-5 p-6">
        <label className="block text-sm text-[var(--text-primary)]">
          المادة
          <select name="course" required className={field}>
            {COURSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-[var(--text-primary)]">
          نوع الملف
          <select name="resource_type" className={field}>
            {RESOURCE_TYPES.filter((t) => t.value !== "video").map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-[var(--text-primary)]">
          عنوان الملف
          <input
            name="title"
            required
            placeholder="مثال: تلخيص شابتر 3"
            className={field}
          />
        </label>

        <label className="block text-sm text-[var(--text-primary)]">
          اسم المساهم (اختياري)
          <input
            name="contributor"
            placeholder="يظهر على الملف بعد الموافقة"
            className={field}
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            1) اختر الملف من هنا
          </p>
          <FileDropZone
            name="file"
            required
            label="اضغط لاختيار ملف PDF أو صورة"
            hint={`حتى ${maxMb} ميجابايت — هذا مربع اختيار الملف`}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
          <input name="rights" type="checkbox" required className="mt-1" />
          أتعهّد أن الملف من حقي أو مصرّح بمشاركته لأغراض دراسية.
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            2) ثم اضغط زر الإرسال
          </p>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 py-3 text-center text-base"
          >
            <SendIcon />
            {loading
              ? progress || "جاري الرفع…"
              : "إرسال الملف للمراجعة"}
          </button>
        </div>

        {error && (
          <p className="rounded border border-[#e07a7a]/40 bg-[color-mix(in_srgb,#e07a7a_10%,transparent)] p-3 text-sm text-[#e07a7a]">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-[var(--accent-gold)]">{message}</p>
        )}
      </form>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}
