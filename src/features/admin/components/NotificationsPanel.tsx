"use client";

import { useState } from "react";
import type {
  AdminAudience,
  AdminMessageRow,
} from "@/features/admin/dashboard";

const AUDIENCE_AR: Record<AdminAudience, string> = {
  all: "الجميع",
  onboarded: "من أكمل التسجيل",
  telegram: "المربوطون بتيليجرام",
};

export function NotificationsPanel({
  messages,
  onSent,
}: {
  messages: AdminMessageRow[];
  onSent: () => void;
}) {
  const [audience, setAudience] = useState<AdminAudience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showOnHome, setShowOnHome] = useState(true);
  const [sendTelegram, setSendTelegram] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "notification",
        title,
        body,
        audience,
        show_on_home: showOnHome,
        send_telegram: sendTelegram,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "فشل الإرسال");
      return;
    }
    setTitle("");
    setBody("");
    setMsg(
      data.telegram_sent
        ? `أُرسل الإشعار · تيليجرام: ${data.telegram_sent}`
        : "أُرسل الإشعار"
    );
    onSent();
  }

  const notes = messages.filter((m) => m.kind === "notification");

  return (
    <div className="space-y-6">
      <form className="card-soft space-y-3 p-5" onSubmit={onSubmit}>
        <h2 className="font-semibold text-[var(--text-primary)]">
          رسالة جديدة لصندوق المستخدمين
        </h2>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as AdminAudience)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        >
          {Object.entries(AUDIENCE_AR).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الإشعار"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="النص"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showOnHome}
            onChange={(e) => setShowOnHome(e.target.checked)}
          />
          إظهار في آخر التحديثات على الرئيسية
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={sendTelegram}
            onChange={(e) => setSendTelegram(e.target.checked)}
          />
          إرسال عبر بوت تيليجرام للمستهدفين المربوطين
        </label>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "جارٍ الإرسال…" : "إرسال لصندوق الرسائل"}
        </button>
        {msg ? (
          <p className="text-sm text-[var(--accent-gold)]">{msg}</p>
        ) : null}
      </form>

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="card-soft p-4 text-sm">
            <p className="font-medium text-[var(--text-primary)]">{n.title}</p>
            <p className="mt-1 text-[var(--text-secondary)]">{n.body}</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {AUDIENCE_AR[n.audience]} ·{" "}
              {new Date(n.created_at).toLocaleString("ar")}
              {n.sent_via_telegram ? ` · تيليجرام ${n.telegram_sent}` : ""}
            </p>
          </li>
        ))}
        {!notes.length ? (
          <p className="text-sm text-[var(--text-secondary)]">لا إشعارات بعد.</p>
        ) : null}
      </ul>
    </div>
  );
}
