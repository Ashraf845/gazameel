import { getSessionUser } from "@/features/auth/auth";
import { createTelegramLinkToken } from "@/features/automations/telegram";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { SupabaseSetupNotice } from "@/shared/components/SupabaseSetupNotice";
import { isMissingOrPlaceholder } from "@/shared/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function TelegramLinkPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <SupabaseSetupNotice title="ربط تيليجرام" />;
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/telegram");

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  const botReady = !isMissingOrPlaceholder(botUsername);

  const linkToken = botReady ? await createTelegramLinkToken(user.id) : null;
  const deepLink =
    botReady && linkToken
      ? `https://t.me/${botUsername}?start=link_${linkToken}`
      : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
      <h1 className="text-3xl font-bold">ربط تيليجرام</h1>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
        اضغط الرابط لفتح البوت وإرسال /start — يُحفظ chat id عندك لاستقبال تذكيرات
        الامتحانات وسؤال اليوم. الرابط لمرة واحدة وينتهي خلال دقائق.
      </p>
      {profile?.telegram_chat_id ? (
        <p className="text-[var(--accent-gold)] text-sm">
          مرتبط حاليًا (chat: {profile.telegram_chat_id})
        </p>
      ) : (
        <p className="text-[var(--warn)] text-sm">غير مرتبط بعد</p>
      )}
      {deepLink ? (
        <a
          href={deepLink}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-block"
        >
          افتح البوت واربط الحساب
        </a>
      ) : botReady && !linkToken ? (
        <p className="text-sm text-[var(--warn)] leading-relaxed">
          تعذّر إنشاء رابط الربط. تأكد من تنفيذ جدول{" "}
          <code className="text-[var(--text-primary)]">telegram_link_tokens</code> في
          Supabase ثم أعد تحميل الصفحة.
        </p>
      ) : (
        <p className="text-sm text-[var(--warn)] leading-relaxed">
          البوت غير مضبوط بعد. ضع اسم المستخدم الحقيقي في{" "}
          <code className="text-[var(--text-primary)]">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>{" "}
          داخل <code className="text-[var(--text-primary)]">.env.local</code> (بدون @)، ثم أعد
          تشغيل الخادم. انظر{" "}
          <code className="text-[var(--text-primary)]">docs/درس-المرحلة-2.md</code>.
        </p>
      )}
    </div>
  );
}
