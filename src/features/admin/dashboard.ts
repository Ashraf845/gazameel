import { createAdminClient } from "@/shared/lib/supabase/admin";
import { broadcastTelegramToChats } from "@/features/automations/telegram";
import { sendBroadcastEmail } from "@/features/admin/email";

export type AdminAudience = "all" | "onboarded" | "telegram";
export type AdminMessageKind = "email" | "notification";

export type DashboardStats = {
  users: number;
  onboarded: number;
  telegram: number;
  admins: number;
  pending: number;
  approved: number;
  quizAttempts: number;
  questions: number;
  exams: number;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  student_id: string | null;
  onboarding_done: boolean;
  telegram_chat_id: string | null;
  is_admin: boolean;
  created_at: string;
};

export type AdminMessageRow = {
  id: string;
  kind: AdminMessageKind;
  title: string;
  body: string;
  audience: AdminAudience;
  show_on_home: boolean;
  sent_via_telegram: boolean;
  telegram_sent: number;
  email_sent: number;
  email_failed: number;
  created_at: string;
};

async function countEq(
  table: string,
  column?: string,
  value?: string | boolean
): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  let q = admin.from(table).select("id", { count: "exact", head: true });
  if (column !== undefined) q = q.eq(column, value as never);
  const { count } = await q;
  return count ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [
    users,
    onboarded,
    telegram,
    admins,
    pending,
    approved,
    quizAttempts,
    questions,
    exams,
  ] = await Promise.all([
    countEq("profiles"),
    countEq("profiles", "onboarding_done", true),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("telegram_chat_id", "is", null)
      .then((r) => r.count ?? 0),
    countEq("profiles", "is_admin", true),
    countEq("resources", "status", "pending"),
    countEq("resources", "status", "approved"),
    countEq("quiz_attempts"),
    countEq("questions", "active", true),
    countEq("exam_events"),
  ]);

  return {
    users,
    onboarded,
    telegram,
    admins,
    pending,
    approved,
    quizAttempts,
    questions,
    exams,
  };
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, student_id, onboarding_done, telegram_chat_id, is_admin, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data || []) as AdminUserRow[];
}

export async function listAdminMessages(
  kind?: AdminMessageKind
): Promise<AdminMessageRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  let q = admin
    .from("admin_messages")
    .select(
      "id, kind, title, body, audience, show_on_home, sent_via_telegram, telegram_sent, email_sent, email_failed, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) return [];
  return (data || []) as AdminMessageRow[];
}

function matchesAudience(user: AdminUserRow, audience: AdminAudience) {
  if (audience === "onboarded") return !!user.onboarding_done;
  if (audience === "telegram") return !!user.telegram_chat_id;
  return true;
}

export function emailsForAudience(
  users: AdminUserRow[],
  audience: AdminAudience
): string[] {
  return users
    .filter((u) => matchesAudience(u, audience) && u.email)
    .map((u) => u.email as string);
}

export async function createAdminMessage(input: {
  kind: AdminMessageKind;
  title: string;
  body: string;
  audience: AdminAudience;
  showOnHome?: boolean;
  sendTelegram?: boolean;
  sendEmail?: boolean;
  createdBy: string;
}): Promise<
  | {
      ok: true;
      telegram_sent: number;
      email_sent: number;
      email_failed: number;
      email_error?: string;
    }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "قاعدة البيانات غير مُعدّة" };

  const title = input.title.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 4000);
  if (!title || !body) return { ok: false, error: "العنوان والنص مطلوبان" };

  const users = await listAdminUsers();
  const emails = emailsForAudience(users, input.audience);
  const { data: message, error } = await admin
    .from("admin_messages")
    .insert({
      kind: input.kind,
      title,
      body,
      audience: input.audience,
      show_on_home: !!input.showOnHome,
      sent_via_telegram: !!input.sendTelegram,
      telegram_sent: 0,
      email_sent: 0,
      email_failed: 0,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error || !message) {
    const errorMessage = error?.message || "فشل حفظ الرسالة";
    if (/admin_messages|does not exist|schema cache/i.test(errorMessage)) {
      return {
        ok: false,
        error: "نفّذ supabase/admin_dashboard.sql في SQL Editor ثم أعد المحاولة.",
      };
    }
    return { ok: false, error: errorMessage };
  }

  let telegramSent = 0;
  if (input.sendTelegram) {
    const chats = users
      .filter((u) => matchesAudience(u, input.audience) && u.telegram_chat_id)
      .map((u) => u.telegram_chat_id as string);
    const result = await broadcastTelegramToChats(
      chats,
      `${title}\n\n${body}`
    );
    telegramSent = result.sent;
  }

  const emailResult =
    input.sendEmail && input.kind === "email"
      ? await sendBroadcastEmail({
          messageId: message.id,
          recipients: emails,
          subject: title,
          text: body,
        })
      : { ok: true as const, sent: 0, failed: 0 };

  if (input.showOnHome && input.kind === "notification") {
    await admin.from("updates_feed").insert({
      message: `${title} — ${body.slice(0, 180)}`,
    });
  }

  await admin
    .from("admin_messages")
    .update({
      telegram_sent: telegramSent,
      email_sent: emailResult.sent,
      email_failed: emailResult.failed,
    })
    .eq("id", message.id);

  return {
    ok: true,
    telegram_sent: telegramSent,
    email_sent: emailResult.sent,
    email_failed: emailResult.failed,
    ...(!emailResult.ok ? { email_error: emailResult.error } : {}),
  };
}
