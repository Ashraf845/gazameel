"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES } from "@/shared/lib/courses";
import type { CatalogCourse } from "@/shared/lib/courses";
import { DashboardPanel } from "@/features/admin/components/DashboardPanel";
import { UsersMailPanel } from "@/features/admin/components/UsersMailPanel";
import { NotificationsPanel } from "@/features/admin/components/NotificationsPanel";
import { QueuePanel } from "@/features/admin/components/QueuePanel";
import { DirectUploadPanel } from "@/features/admin/components/DirectUploadPanel";
import { ExamsPanel } from "@/features/admin/components/ExamsPanel";
import { QuestionsPanel } from "@/features/admin/components/QuestionsPanel";
import { PollsAdminPanel } from "@/features/admin/components/PollsAdminPanel";
import type {
  AdminMessageRow,
  AdminUserRow,
  DashboardStats,
} from "@/features/admin/dashboard";

type Tab =
  | "dash"
  | "mail"
  | "notify"
  | "queue"
  | "upload"
  | "exams"
  | "questions"
  | "polls";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dash");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [configHint, setConfigHint] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [messages, setMessages] = useState<AdminMessageRow[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [courses, setCourses] = useState<CatalogCourse[]>([...COURSES]);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setStats(data.stats || null);
    setUsers(data.users || []);
    setMessages(data.messages || []);
    setContactEmail(data.contact_email || "");
    if (Array.isArray(data.courses) && data.courses.length) {
      setCourses(data.courses);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard")
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 503) {
          setConfigHint(
            "Supabase غير مُعدّ — يمكنك تصفّح الواجهة، لكن طابور المراجعة يحتاج .env.local."
          );
          setIsAdmin(true);
          return;
        }
        if (!r.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await r.json().catch(() => ({}));
        setIsAdmin(true);
        setStats(data.stats || null);
        setUsers(data.users || []);
        setMessages(data.messages || []);
        setContactEmail(data.contact_email || "");
        if (Array.isArray(data.courses) && data.courses.length) {
          setCourses(data.courses);
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAdmin === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-[var(--text-secondary)]">
        جاري التحقق…
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">غير مصرّح</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          لوحة الأدمن لمن بريده يطابق <code>ADMIN_EMAIL</code> في البيئة.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">لوحة التحكم</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        إحصائيات المستخدمين، البريد، الإشعارات، ومراجعة المساهمات.
      </p>
      {configHint && (
        <p className="mb-4 text-sm leading-relaxed text-[var(--warn)]">{configHint}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["dash", "الإحصائيات"],
            ["mail", "البريد"],
            ["notify", "الإشعارات"],
            ["queue", "طابور المساهمات"],
            ["upload", "رفع مباشر"],
            ["exams", "مواعيد"],
            ["questions", "أسئلة"],
            ["polls", "استطلاعات"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === id
                ? "bg-[var(--accent-gold)] text-[var(--accent-gold-text-on)]"
                : "bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] text-[var(--text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dash" && <DashboardPanel stats={stats} users={users} />}
      {tab === "mail" && (
        <UsersMailPanel
          users={users}
          contactEmail={contactEmail}
          onSent={loadDashboard}
        />
      )}
      {tab === "notify" && (
        <NotificationsPanel messages={messages} onSent={loadDashboard} />
      )}
      {tab === "queue" && <QueuePanel dbReady={!configHint} />}
      {tab === "upload" && <DirectUploadPanel courses={courses} />}
      {tab === "exams" && <ExamsPanel courses={courses} />}
      {tab === "questions" && <QuestionsPanel courses={courses} />}
      {tab === "polls" && <PollsAdminPanel courses={courses} />}
    </div>
  );
}
