"use client";

import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  options: string[];
  counts: number[];
  total_votes: number;
  courses: { name_ar: string } | null;
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/polls");
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) {
      setSetupHint(
        data.error ||
          "قاعدة البيانات غير مُعدّة — راجع .env.local و docs/درس-المرحلة-1.md"
      );
      setPolls([]);
      return;
    }
    setSetupHint(null);
    setPolls(data.polls || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function vote(pollId: string, option_index: number) {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", poll_id: pollId, option_index }),
    });
    const data = await res.json();
    setMsg(res.ok ? "تم تسجيل صوتك" : data.error);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">استطلاعات الرأي</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        قيّم صعوبة الامتحانات لمساعدة زملائك في التركيز على المراجعات.
      </p>
      {setupHint && (
        <p className="mb-4 text-sm text-[var(--warn)] leading-relaxed">{setupHint}</p>
      )}
      {msg && <p className="text-sm text-[var(--accent-gold)] mb-4">{msg}</p>}
      {!setupHint && !polls.length && (
        <p className="text-[var(--text-secondary)] text-sm">
          لا استطلاعات نشطة. ينشئها الأدمن من اللوحة.
        </p>
      )}
      <ul className="space-y-4">
        {polls.map((p) => (
          <li key={p.id} className="card-soft p-5 space-y-3">
            <h2 className="font-semibold">{p.question}</h2>
            {p.courses?.name_ar && (
              <p className="text-xs text-[var(--text-secondary)]">{p.courses.name_ar}</p>
            )}
            {p.options.map((opt, i) => {
              const pct =
                p.total_votes > 0
                  ? Math.round((p.counts[i] / p.total_votes) * 100)
                  : 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => vote(p.id, i)}
                  className="w-full text-right rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent-gold)]/50"
                >
                  <div className="flex justify-between gap-2">
                    <span>{opt}</span>
                    <span className="text-[var(--text-secondary)]">
                      {p.counts[i]} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-gold)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
