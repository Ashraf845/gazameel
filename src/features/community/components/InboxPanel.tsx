"use client";

import { useEffect, useState } from "react";
import type { InboxMessage } from "@/features/community/messages";

async function fetchInbox() {
  const response = await fetch("/api/messages", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "تعذّر تحميل الرسائل");
  }
  return (data.messages || []) as InboxMessage[];
}

export function InboxPanel() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchInbox()
      .then((items) => {
        if (cancelled) return;
        setMessages(items);
        setError(null);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, read: true } : message
      )
    );
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId }),
    });
    if (!response.ok) {
      void fetchInbox().then(setMessages).catch(() => undefined);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">جارٍ تحميل الرسائل…</p>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--warn)]">{error}</p>;
  }

  if (!messages.length) {
    return (
      <div className="card-soft p-6 text-center text-sm text-[var(--text-secondary)]">
        صندوق الرسائل فارغ حاليًا.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`card-soft p-4 ${
            message.read
              ? ""
              : "border-[var(--accent-gold)] bg-[color-mix(in_srgb,var(--accent-gold)_7%,var(--bg-surface))]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {!message.read ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-gold)]"
                    aria-label="غير مقروءة"
                  />
                ) : null}
                <h2 className="font-semibold text-[var(--text-primary)]">
                  {message.title}
                </h2>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {message.body}
              </p>
              <time className="mt-3 block text-xs text-[var(--text-secondary)]">
                {new Date(message.created_at).toLocaleString("ar")}
              </time>
            </div>
            {!message.read ? (
              <button
                type="button"
                onClick={() => markRead(message.id)}
                className="shrink-0 rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                تمت القراءة
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
