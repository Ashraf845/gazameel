import { Bot, InlineKeyboard } from "grammy";
import { randomBytes } from "crypto";
import { createSignedUrl, reviewResource } from "@/features/moderation/moderation";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { isMissingOrPlaceholder } from "@/shared/lib/supabase/config";

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000;

export function getBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (isMissingOrPlaceholder(token)) return null;
  try {
    return new Bot(token!);
  } catch {
    return null;
  }
}

export function getAdminChatId() {
  const id = process.env.ADMIN_TELEGRAM_CHAT_ID?.trim() || "";
  if (isMissingOrPlaceholder(id)) return "";
  return id;
}

const BOT_COMMANDS = [
  { command: "start", description: "بدء الربط والترحيب" },
  { command: "help", description: "قائمة الأوامر" },
  { command: "countdown", description: "العد التنازلي للمواعيد" },
  { command: "daily", description: "سؤال اليوم" },
  { command: "whoami", description: "عرض رقم المحادثة chat_id" },
];

/** يربط Webhook تيليجرام بعنوان الإنتاج (setWebhook + أوامر البوت) */
export async function registerProductionWebhook(): Promise<
  | { ok: true; url: string; bot: string }
  | { ok: false; error: string }
> {
  const bot = getBot();
  if (!bot) return { ok: false, error: "telegram_bot_not_configured" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  if (
    !appUrl ||
    appUrl.includes("localhost") ||
    appUrl.includes("127.0.0.1") ||
    !appUrl.startsWith("https://")
  ) {
    return { ok: false, error: "need_https_app_url" };
  }

  let origin: string;
  try {
    origin = new URL(appUrl).origin;
  } catch {
    return { ok: false, error: "invalid_app_url" };
  }

  const webhookUrl = `${origin}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  try {
    await bot.api.setWebhook(webhookUrl, {
      secret_token: isMissingOrPlaceholder(secret) ? undefined : secret,
      allowed_updates: ["message", "callback_query"],
    });
    await bot.api.setMyCommands(BOT_COMMANDS);
    const me = await bot.api.getMe();
    return { ok: true, url: webhookUrl, bot: me.username || "" };
  } catch (e) {
    console.error("registerProductionWebhook", e);
    return { ok: false, error: "telegram_api_failed" };
  }
}

/**
 * توكن لمرة واحدة لربط تيليجرام — لا نضع user UUID في الرابط.
 * يُنشأ من صفحة /telegram (سيرفر) ويُستهلك عند /start link_<token>.
 */
export async function createTelegramLinkToken(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS).toISOString();

  await admin.from("telegram_link_tokens").delete().eq("user_id", userId);

  const { error } = await admin.from("telegram_link_tokens").insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) {
    console.error("createTelegramLinkToken", error);
    return null;
  }
  return token;
}

async function consumeTelegramLinkToken(
  rawToken: string,
  chatId: number
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "no_db" };

  const token = rawToken.trim();
  if (!token || token.length > 128) {
    return { ok: false, reason: "invalid" };
  }

  // حذف ذرّي + إرجاع الصف = استهلاك لمرة واحدة (يمنع إعادة الاستخدام)
  const { data: row, error: delErr } = await admin
    .from("telegram_link_tokens")
    .delete()
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();

  if (delErr || !row?.user_id) {
    return { ok: false, reason: "expired_or_used" };
  }

  const { error: linkErr } = await admin
    .from("profiles")
    .update({ telegram_chat_id: String(chatId) })
    .eq("id", row.user_id);

  if (linkErr) {
    if (linkErr.code === "23505") {
      return { ok: false, reason: "chat_taken" };
    }
    return { ok: false, reason: "update_failed" };
  }
  return { ok: true };
}

/** إشعار أدمن عند رفع مساهمة جديدة */
export async function notifyAdminNewSubmission(resourceId: string) {
  const bot = getBot();
  const chatId = getAdminChatId();
  if (!bot || !chatId) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: resource } = await admin
    .from("resources")
    .select(
      "id, title, contributor_display_name, storage_path, courses(name_ar), profiles:uploaded_by(full_name, student_id, email)"
    )
    .eq("id", resourceId)
    .maybeSingle();

  if (!resource) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let preview = `${appUrl}/admin`;
  if (resource.storage_path) {
    try {
      preview = await createSignedUrl(resource.storage_path, 600);
    } catch {
      /* استخدم رابط اللوحة */
    }
  }

  const courseName =
    (resource.courses as { name_ar?: string } | null)?.name_ar ?? "مادة";
  const uploader = resource.profiles as {
    full_name?: string;
    student_id?: string;
    email?: string;
  } | null;

  const text = [
    "📄 مساهمة جديدة بانتظار المراجعة",
    `المادة: ${courseName}`,
    `العنوان: ${resource.title}`,
    `المساهم: ${resource.contributor_display_name || uploader?.full_name || "—"}`,
    `الرقم الجامعي: ${uploader?.student_id || "—"}`,
    `معاينة (تنتهي خلال دقائق): ${preview}`,
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .text("موافقة ✅", `approve:${resourceId}`)
    .text("رفض ❌", `reject:${resourceId}`);

  try {
    await bot.api.sendMessage(chatId, text, { reply_markup: keyboard });
  } catch (e) {
    console.error("notifyAdminNewSubmission", e);
  }
}

/** إشعار صاحب المساهمة بنتيجة المراجعة إذا كان حسابه مربوطًا بتيليجرام. */
export async function notifySubmitterReviewDecision(
  resourceId: string,
  action: "approve" | "reject",
  reason?: string
) {
  const bot = getBot();
  const admin = createAdminClient();
  if (!bot || !admin) return;

  const { data: resource, error } = await admin
    .from("resources")
    .select(
      "title, rejection_reason, courses(name_ar), profiles:uploaded_by(telegram_chat_id)"
    )
    .eq("id", resourceId)
    .maybeSingle();

  if (error || !resource) {
    console.error("notifySubmitterReviewDecision", error);
    return;
  }

  const uploader = resource.profiles as {
    telegram_chat_id?: string | null;
  } | null;
  const chatId = uploader?.telegram_chat_id;
  if (!chatId) return;

  const courseName =
    (resource.courses as { name_ar?: string } | null)?.name_ar ?? "المادة";
  const lines =
    action === "approve"
      ? [
          "تم قبول ملفك ✅",
          `العنوان: ${resource.title}`,
          `المادة: ${courseName}`,
          "صار الملف ظاهرًا في مكتبة Gazameel. شكرًا لمساهمتك!",
        ]
      : [
          "تم رفض ملفك ❌",
          `العنوان: ${resource.title}`,
          `المادة: ${courseName}`,
          `السبب: ${reason?.trim() || resource.rejection_reason || "لم يُذكر سبب"}`,
          "يمكنك مراجعة مساهماتك ورفع نسخة معدّلة.",
        ];

  try {
    await bot.api.sendMessage(chatId, lines.join("\n"));
  } catch (sendError) {
    console.error("notifySubmitterReviewDecision", sendError);
  }
}

export async function handleTelegramUpdate(update: {
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
  message?: {
    text?: string;
    chat: { id: number };
    from?: { id: number };
  };
}) {
  const bot = getBot();
  if (!bot) return;

  if (update.message?.text?.startsWith("/")) {
    await handleCommand(bot, update.message);
    return;
  }

  const cq = update.callback_query;
  if (!cq?.data) return;

  // إجابات سؤال اليوم: daily:QID:A
  if (cq.data.startsWith("daily:")) {
    await handleDailyAnswer(bot, cq);
    return;
  }

  const adminId = getAdminChatId();
  if (!adminId || String(cq.from.id) !== adminId) {
    await bot.api.answerCallbackQuery(cq.id, {
      text: "عذرًا، هذا الأمر مخصص للأدمن فقط!",
      show_alert: true,
    });
    return;
  }

  const [action, resourceId] = cq.data.split(":");
  if (!resourceId || (action !== "approve" && action !== "reject")) {
    await bot.api.answerCallbackQuery(cq.id, { text: "بيانات غير صالحة" });
    return;
  }

  const result = await reviewResource(resourceId, action as "approve" | "reject");
  if (!result.ok) {
    await bot.api.answerCallbackQuery(cq.id, {
      text: result.error,
      show_alert: true,
    });
    return;
  }

  await notifySubmitterReviewDecision(
    resourceId,
    action as "approve" | "reject"
  );

  const label =
    action === "approve"
      ? "تمت الموافقة بواسطة الأدمن ✅"
      : "تم الرفض بواسطة الأدمن ❌";

  await bot.api.answerCallbackQuery(cq.id, { text: label });
  if (cq.message) {
    try {
      await bot.api.editMessageText(
        cq.message.chat.id,
        cq.message.message_id,
        label
      );
    } catch {
      /* الرسالة قد تكون معدّلة مسبقًا */
    }
  }
}

async function handleDailyAnswer(
  bot: Bot,
  cq: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  }
) {
  const parts = (cq.data || "").split(":");
  // daily:questionId:A
  const questionId = parts[1];
  const chosen = parts[2]?.toUpperCase();
  if (!questionId || !chosen) {
    await bot.api.answerCallbackQuery(cq.id, { text: "بيانات غير صالحة" });
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    await bot.api.answerCallbackQuery(cq.id, {
      text: "قاعدة البيانات غير مُعدّة",
      show_alert: true,
    });
    return;
  }

  const { data: q } = await admin
    .from("questions")
    .select("correct, explanation, question")
    .eq("id", questionId)
    .maybeSingle();

  if (!q) {
    await bot.api.answerCallbackQuery(cq.id, { text: "السؤال غير موجود" });
    return;
  }

  const ok = chosen === q.correct;
  const text = ok
    ? `صحيح ✅ الإجابة ${q.correct}`
    : `خطأ ❌ الصحيحة ${q.correct}` +
      (q.explanation ? `\n${q.explanation}` : "");

  await bot.api.answerCallbackQuery(cq.id, {
    text: ok ? "أحسنت!" : "حاول مرة أخرى لاحقًا",
    show_alert: true,
  });

  if (cq.message) {
    try {
      await bot.api.editMessageText(
        cq.message.chat.id,
        cq.message.message_id,
        `${q.question}\n\nاخترت: ${chosen}\n${text}`
      );
    } catch {
      /* */
    }
  }
}

async function handleCommand(
  bot: Bot,
  message: { text?: string; chat: { id: number }; from?: { id: number } }
) {
  const text = message.text || "";
  const chatId = message.chat.id;

  if (text.startsWith("/start")) {
    const admin = createAdminClient();
    const parts = text.split(/\s+/);
    if (parts[1]?.startsWith("link_")) {
      const linkToken = parts[1].slice("link_".length);
      if (!admin) {
        await bot.api.sendMessage(
          chatId,
          "قاعدة البيانات غير مُعدّة بعد على الخادم."
        );
        return;
      }
      const result = await consumeTelegramLinkToken(linkToken, chatId);
      if (!result.ok) {
        const msg =
          result.reason === "chat_taken"
            ? "هذا التليجرام مربوط بحساب آخر في Gazameel."
            : result.reason === "expired_or_used"
              ? "رابط الربط منتهٍ أو مُستخدم. افتح /telegram من الموقع واطلب رابطًا جديدًا."
              : "تعذّر ربط الحساب. حاول مرة أخرى من الموقع (/telegram).";
        await bot.api.sendMessage(chatId, msg);
        return;
      }
      await bot.api.sendMessage(
        chatId,
        "تم ربط حسابك في Gazameel بهذا التليجرام. ستصلك التذكيرات هنا."
      );
      return;
    }
    await bot.api.sendMessage(chatId, welcomeText());
    return;
  }

  if (text.startsWith("/help")) {
    await bot.api.sendMessage(chatId, welcomeText());
    return;
  }

  if (text.startsWith("/whoami")) {
    const adminId = getAdminChatId();
    const isAdmin = !!adminId && String(chatId) === adminId;
    const lines = ["رقمك في تيليجرام:", `chat_id: ${chatId}`];
    if (isAdmin) {
      lines.push("", "تم التعرف عليك كأدمن المنصة. أزرار الموافقة/الرفض تصلك هنا.");
    }
    await bot.api.sendMessage(chatId, lines.join("\n"));
    return;
  }

  if (text.startsWith("/countdown")) {
    const admin = createAdminClient();
    if (!admin) {
      await bot.api.sendMessage(
        chatId,
        "قاعدة البيانات غير مُعدّة بعد على الخادم."
      );
      return;
    }
    const { data: events } = await admin
      .from("exam_events")
      .select("title, starts_at, courses(name_ar)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5);

    if (!events?.length) {
      await bot.api.sendMessage(chatId, "لا مواعيد قادمة حاليًا.");
      return;
    }

    const lines = events.map((e) => {
      const ms = new Date(e.starts_at).getTime() - Date.now();
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const course = (e.courses as { name_ar?: string } | null)?.name_ar ?? "";
      return `• ${e.title} (${course})\n  متبقي: ${days} يوم و ${hours} ساعة`;
    });
    await bot.api.sendMessage(chatId, "العد التنازلي:\n\n" + lines.join("\n\n"));
    return;
  }

  if (text.startsWith("/daily")) {
    const admin = createAdminClient();
    if (!admin) {
      await bot.api.sendMessage(
        chatId,
        "قاعدة البيانات غير مُعدّة بعد على الخادم."
      );
      return;
    }
    let { data: q } = await admin
      .from("questions")
      .select("*")
      .eq("active", true)
      .eq("daily_eligible", true)
      .limit(20);

    if (!q?.length) {
      const { data: anyQ } = await admin
        .from("questions")
        .select("*")
        .eq("active", true)
        .limit(10);
      q = anyQ;
    }

    if (!q?.length) {
      await bot.api.sendMessage(chatId, "لا أسئلة متاحة اليوم بعد.");
      return;
    }
    const pick = q[Math.floor(Math.random() * q.length)];
    await sendDailyQuestion(bot, chatId, pick);
    return;
  }

  await bot.api.sendMessage(
    chatId,
    "أمر غير معروف. أرسل /help لعرض الأوامر."
  );
}

function welcomeText() {
  return [
    "مرحبًا بك في بوت Gazameel.",
    "اربط حسابك من الموقع (/telegram)، أو استخدم الأوامر:",
    "/countdown — العد التنازلي للمواعيد",
    "/daily — سؤال اليوم",
    "/whoami — عرض chat_id",
    "/help — هذه القائمة",
  ].join("\n");
}

async function sendDailyQuestion(
  bot: Bot,
  chatId: number,
  q: {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  }
) {
  const keyboard = new InlineKeyboard()
    .text("A", `daily:${q.id}:A`)
    .text("B", `daily:${q.id}:B`)
    .row()
    .text("C", `daily:${q.id}:C`)
    .text("D", `daily:${q.id}:D`);

  await bot.api.sendMessage(
    chatId,
    [
      "سؤال اليوم 📝",
      q.question,
      `A) ${q.option_a}`,
      `B) ${q.option_b}`,
      `C) ${q.option_c}`,
      `D) ${q.option_d}`,
      "",
      "اختر إجابة من الأزرار (بدون كشف الجواب مسبقًا).",
    ].join("\n"),
    { reply_markup: keyboard }
  );
}

/** تذكيرات مجدولة — يُستدعى من cron API */
export async function sendExamReminders() {
  const bot = getBot();
  if (!bot) return { sent: 0, reason: "no_bot" as const };

  const admin = createAdminClient();
  if (!admin) return { sent: 0, reason: "no_db" as const };
  const now = Date.now();
  const windows = [
    { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "3d", ms: 3 * 24 * 60 * 60 * 1000 },
    { label: "1d", ms: 24 * 60 * 60 * 1000 },
    { label: "2h", ms: 2 * 60 * 60 * 1000 },
  ];

  const { data: events } = await admin
    .from("exam_events")
    .select("id, title, starts_at, course_id, courses(name_ar)")
    .gte("starts_at", new Date().toISOString());

  let sent = 0;
  for (const ev of events || []) {
    const start = new Date(ev.starts_at).getTime();
    for (const w of windows) {
      const diff = start - now;
      if (Math.abs(diff - w.ms) > 30 * 60 * 1000) continue;

      const { data: existing } = await admin
        .from("reminder_log")
        .select("id")
        .eq("exam_event_id", ev.id)
        .eq("window_label", w.label)
        .maybeSingle();
      if (existing) continue;

      const { data: students } = await admin
        .from("student_courses")
        .select("profiles(telegram_chat_id)")
        .eq("course_id", ev.course_id);

      const course = (ev.courses as { name_ar?: string } | null)?.name_ar ?? "";
      const msg = `تذكير (${w.label}): ${ev.title} — ${course}\nالموعد: ${new Date(ev.starts_at).toLocaleString("ar")}`;

      for (const row of students || []) {
        const tg = (row.profiles as { telegram_chat_id?: string } | null)
          ?.telegram_chat_id;
        if (!tg) continue;
        try {
          await bot.api.sendMessage(tg, msg);
          sent++;
        } catch {
          /* تجاهل فشل إرسال فردي */
        }
      }

      await admin.from("reminder_log").insert({
        exam_event_id: ev.id,
        window_label: w.label,
      });
    }
  }

  return { sent };
}

/** بث نص للطلاب المربوطين بتيليجرام (من لوحة الأدمن) */
export async function broadcastTelegramToChats(
  chatIds: string[],
  text: string
): Promise<{ sent: number; failed: number }> {
  const bot = getBot();
  if (!bot || !text.trim()) return { sent: 0, failed: 0 };

  const body = text.trim().slice(0, 3500);
  let sent = 0;
  let failed = 0;
  const unique = [...new Set(chatIds.filter(Boolean))];

  for (const chatId of unique) {
    try {
      await bot.api.sendMessage(chatId, body);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
