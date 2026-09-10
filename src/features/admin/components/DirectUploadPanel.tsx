"use client";

import { useState } from "react";
import { RESOURCE_TYPES, type CatalogCourse } from "@/shared/lib/courses";
import { FileDropZone } from "@/shared/components/FileDropZone";
import {
  mimeFromFile,
  putFileToSignedUrl,
  readApiError,
  validateUploadFile,
} from "@/features/upload/files";
import { MAX_FILE_BYTES } from "@/shared/lib/constants";

/**
 * رفع أدمن مباشر: prepare → رفع لـ Supabase → complete
 * يدعم ملفات حتى 15MB عبر الرفع المباشر (ليس عبر جسم طلب Vercel).
 */
export function DirectUploadPanel({ courses }: { courses: CatalogCourse[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);
    setErr(null);
    setBusy(true);

    const form = e.currentTarget;
    const base = new FormData(form);
    const resourceType = String(base.get("resource_type") || "summary");
    const course = String(base.get("course") || "");
    const baseTitle = String(base.get("title") || "").trim();
    const files = Array.from(
      (form.elements.namedItem("files") as HTMLInputElement)?.files || []
    );

    try {
      if (resourceType === "video") {
        setProgress("جارٍ النشر…");
        const res = await fetch("/api/admin/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course,
            title: baseTitle,
            resource_type: resourceType,
            external_url: String(base.get("external_url") || "").trim(),
          }),
        });
        if (!res.ok) {
          setErr(await readApiError(res, "فشل النشر"));
          return;
        }
        setMsg("نُشر في المكتبة");
        form.reset();
        return;
      }

      if (!files.length) {
        setErr("اضغط مربع الرفع واختر ملفًا واحدًا على الأقل");
        return;
      }

      let ok = 0;
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const localErr = validateUploadFile(file);
        if (localErr) {
          errors.push(`${file.name}: ${localErr}`);
          continue;
        }

        const title =
          files.length === 1
            ? baseTitle || file.name.replace(/\.[^.]+$/, "")
            : `${baseTitle || "ملف"} (${i + 1}) — ${file.name.replace(/\.[^.]+$/, "")}`;
        const mime = mimeFromFile(file);

        setProgress(`تجهيز ${i + 1}/${files.length}: ${file.name}`);
        const prepRes = await fetch("/api/admin/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prepare",
            course,
            title,
            resource_type: resourceType,
            mime_type: mime,
            file_size: file.size,
          }),
        });
        if (!prepRes.ok) {
          errors.push(
            `${file.name}: ${await readApiError(prepRes, "فشل التجهيز")}`
          );
          continue;
        }
        const prep = await prepRes.json();

        setProgress(`رفع ${i + 1}/${files.length}: ${file.name}`);
        const put = await putFileToSignedUrl(prep.signedUrl, file, mime);
        if (!put.ok) {
          errors.push(`${file.name}: ${put.error}`);
          continue;
        }

        setProgress(`حفظ ${i + 1}/${files.length}`);
        const doneRes = await fetch("/api/admin/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            path: prep.path,
            course,
            title,
            resource_type: resourceType,
            mime_type: mime,
            file_size: file.size,
          }),
        });
        if (!doneRes.ok) {
          errors.push(
            `${file.name}: ${await readApiError(doneRes, "فشل الحفظ")}`
          );
          continue;
        }
        ok++;
      }

      if (ok) {
        setMsg(
          ok === files.length
            ? `نُشر ${ok} ملف في المكتبة`
            : `نُشر ${ok} من ${files.length} — راجع الأخطاء`
        );
        form.reset();
      }
      if (errors.length) setErr(errors.slice(0, 5).join(" · "));
    } catch {
      setErr("فشل الاتصال بالخادم");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const maxMb = Math.round(MAX_FILE_BYTES / (1024 * 1024));
  const field =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]";

  return (
    <form className="card-soft space-y-4 p-5" onSubmit={onSubmit}>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        اختر الملفات من المربع الذهبي ثم «نشر في المكتبة». يدعم حتى {maxMb}{" "}
        ميجابايت للملف (رفع مباشر للتخزين).
      </p>
      <select name="course" required className={field}>
        {courses.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="resource_type" className={field}>
        {RESOURCE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        name="title"
        placeholder="عنوان (اختياري عند تعدد الملفات)"
        className={field}
      />
      <input
        name="external_url"
        placeholder="رابط فيديو (إن اخترت نوع فيديو)"
        className={field}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
          1) اختيار الملفات
        </p>
        <FileDropZone
          name="files"
          multiple
          accept=".pdf,image/*"
          label="اضغط لاختيار ملفات للرفع"
          hint={`PDF أو صور — حتى ${maxMb} ميجابايت لكل ملف`}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
          2) النشر
        </p>
        <button
          type="submit"
          className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 py-3 text-base"
          disabled={busy}
        >
          <PublishIcon />
          {busy ? progress || "جارٍ النشر…" : "نشر في المكتبة الآن"}
        </button>
      </div>
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {err && (
        <p className="rounded border border-[#e07a7a]/40 bg-[color-mix(in_srgb,#e07a7a_10%,transparent)] p-3 text-sm text-[#e07a7a]">
          {err}
        </p>
      )}
    </form>
  );
}

function PublishIcon() {
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
