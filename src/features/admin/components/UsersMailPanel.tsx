"use client";

import { useMemo, useState } from "react";
import type { AdminAudience, AdminUserRow } from "@/features/admin/dashboard";

const AUDIENCE_AR: Record<AdminAudience, string> = {
  all: "الجميع",
  onboarded: "من أكمل التسجيل",
  telegram: "المربوطون بتيليجرام",
};

export function UsersMailPanel({
  users,
  contactEmail,
  onSent,
}: {
  users: AdminUserRow[];
  contactEmail: string;
  onSent: () => void;
}) {
  const [audience, setAudience] = useState<AdminAudience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emails = useMemo(() => {
    return users
      .filter((u) => {
        if (!u.email) return false;
        if (audience === "onboarded") return u.onboarding_done;
        if (audience === "telegram") return !!u.telegram_chat_id;
        return true;
      })
      .map((u) => u.email as string);
  }, [users, audience]);

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setMsg(`نُسخ ${emails.length} بريد`);
    } catch {
      setMsg("تعذّر النسخ");
    }
  }

  async function saveMail(e: React.FormEvent) {
    e.preventDefault();
    if (
      !window.confirm(
        `سيتم إرسال الإعلان إلى ${emails.length} مستخدم. هل تريد المتابعة؟`
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "email",
        title,
        body,
        audience,
        send_email: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "فشل الحفظ");
      return;
    }
    if (data.email_error) {
      setMsg(`حُفظ الإعلان، لكن البريد لم يكتمل: ${data.email_error}`);
      onSent();
      return;
    }
    setTitle("");
    setBody("");
    setMsg(`أُرسل الإعلان إلى ${data.email_sent || 0} مستخدم.`);
    onSent();
  }

  const mailto =
    emails.length > 0
      ? `mailto:${contactEmail || ""}?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
      : "";

  return (
    <div className="space-y-6">
      {contactEmail ? (
        <p className="text-sm text-[var(--text-secondary)]">
          بريد المنصة:{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="text-[var(--accent-gold)]"
          >
            {contactEmail}
          </a>
        </p>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          ضع{" "}
          <code className="text-[var(--accent-gold)]">NEXT_PUBLIC_CONTACT_EMAIL</code>{" "}
          إن أردت إظهار بريد info على اللوحة.
        </p>
      )}

      <form className="card-soft space-y-3 p-5" onSubmit={saveMail}>
        <h2 className="font-semibold text-[var(--text-primary)]">رسالة بريد</h2>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as AdminAudience)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        >
          {Object.entries(AUDIENCE_AR).map(([id, label]) => (
            <option key={id} value={id}>
              {label} ({emails.length} عنوان)
            </option>
          ))}
        </select>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="الموضوع"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="نص الرسالة"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "جارٍ الإرسال…" : `إرسال الإعلان (${emails.length})`}
          </button>
          <button type="button" className="btn-ghost" onClick={copyEmails}>
            نسخ العناوين ({emails.length})
          </button>
          {mailto ? (
            <a href={mailto} className="btn-ghost">
              فتح تطبيق البريد
            </a>
          ) : null}
        </div>
        {msg ? (
          <p className="text-sm text-[var(--accent-gold)]">{msg}</p>
        ) : null}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-right text-sm">
          <thead>
            <tr className="text-[var(--text-secondary)]">
              <th className="p-2 font-medium">الاسم</th>
              <th className="p-2 font-medium">البريد</th>
              <th className="p-2 font-medium">الرقم الجامعي</th>
              <th className="p-2 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="p-2 text-[var(--text-primary)]">
                  {u.full_name || "—"}
                </td>
                <td className="p-2 text-[var(--text-secondary)]">
                  {u.email || "—"}
                </td>
                <td className="p-2 text-[var(--text-secondary)]">
                  {u.student_id || "—"}
                </td>
                <td className="p-2 text-xs text-[var(--text-secondary)]">
                  {u.onboarding_done ? "مسجّل" : "لم يكمل"}
                  {u.telegram_chat_id ? " · تيليجرام" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
