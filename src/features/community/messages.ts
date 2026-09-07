import { createClient } from "@/shared/lib/supabase/server";

export type InboxMessage = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
};

const SETUP_ERROR =
  "نفّذ supabase/admin_dashboard.sql في Supabase ثم أعد تحميل الصفحة.";

export async function listInboxMessages(
  userId: string
): Promise<
  | { ok: true; messages: InboxMessage[]; unread: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "قاعدة البيانات غير مُعدّة" };

  const [{ data: messages, error }, { data: reads, error: readsError }] =
    await Promise.all([
      supabase
        .from("admin_messages")
        .select("id, title, body, created_at")
        .eq("kind", "notification")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("user_message_reads")
        .select("message_id")
        .eq("user_id", userId),
    ]);

  if (error || readsError) {
    const detail = error?.message || readsError?.message || "";
    return {
      ok: false,
      error: /admin_messages|user_message_reads|schema cache|does not exist/i.test(
        detail
      )
        ? SETUP_ERROR
        : "تعذّر تحميل الرسائل",
    };
  }

  const readIds = new Set((reads || []).map((row) => row.message_id as string));
  const inbox = (messages || []).map((message) => ({
    ...message,
    read: readIds.has(message.id),
  })) as InboxMessage[];

  return {
    ok: true,
    messages: inbox,
    unread: inbox.filter((message) => !message.read).length,
  };
}

export async function markInboxMessageRead(
  userId: string,
  messageId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "قاعدة البيانات غير مُعدّة" };

  const { data: visibleMessage } = await supabase
    .from("admin_messages")
    .select("id")
    .eq("id", messageId)
    .eq("kind", "notification")
    .maybeSingle();

  if (!visibleMessage) return { ok: false, error: "الرسالة غير موجودة" };

  const { error } = await supabase.from("user_message_reads").insert({
    message_id: messageId,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    return {
      ok: false,
      error: /user_message_reads|schema cache|does not exist/i.test(error.message)
        ? SETUP_ERROR
        : "تعذّر تحديث الرسالة",
    };
  }

  return { ok: true };
}
