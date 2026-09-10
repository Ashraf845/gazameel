"use client";

import { useRef, useState } from "react";
import {
  mimeFromFile,
  putFileToSignedUrl,
  readApiError,
  validateUploadFile,
} from "@/features/upload/files";

type Props = {
  id: string;
  title: string;
  status: string;
  resourceType: string;
  onDone: () => void;
};

/** أزرار حذف / استبدال لصاحب المساهمة */
export function SubmissionActions({
  id,
  title,
  status,
  resourceType,
  onDone,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onDelete() {
    if (busy) return;
    if (!window.confirm(`حذف «${title}» نهائيًا؟`)) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setErr(await readApiError(res, "فشل الحذف"));
        return;
      }
      setMsg("تم الحذف");
      onDone();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusy(false);
    }
  }

  async function onReplaceFile(file: File) {
    if (busy) return;
    const localErr = validateUploadFile(file);
    if (localErr) {
      setErr(localErr);
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const mime = mimeFromFile(file);
      const prepRes = await fetch(`/api/resources/${id}/replace`, {
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
      const doneRes = await fetch(`/api/resources/${id}/replace`, {
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
      setMsg(data.message || "تم الاستبدال");
      onDone();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onReplaceVideo() {
    if (busy) return;
    const url = window.prompt("رابط الفيديو الجديد:");
    if (!url?.trim()) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/resources/${id}/replace`, {
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
      setMsg(data.message || "تم التحديث");
      onDone();
    } catch {
      setErr("فشل الاتصال");
    } finally {
      setBusy(false);
    }
  }

  const canAct = status === "pending" || status === "approved" || status === "rejected";
  if (!canAct) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-[#e07a7a]/50 px-3 py-1.5 text-sm text-[#e07a7a] disabled:opacity-50"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          حذف
        </button>
        {resourceType === "video" ? (
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-50"
            disabled={busy}
            onClick={() => void onReplaceVideo()}
          >
            تحديث الرابط
          </button>
        ) : (
          <>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-50"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              استبدال الملف
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onReplaceFile(f);
              }}
            />
          </>
        )}
      </div>
      {status === "approved" && (
        <p className="text-xs text-[var(--text-secondary)]">
          الاستبدال يعيد الملف للمراجعة قبل الظهور في المكتبة.
        </p>
      )}
      {msg && <p className="text-sm text-[var(--accent-gold)]">{msg}</p>}
      {err && <p className="text-sm text-[#e07a7a]">{err}</p>}
    </div>
  );
}
