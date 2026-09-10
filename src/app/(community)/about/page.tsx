import { BRAND, DISCLAIMER_AR, TAGLINE_AR } from "@/shared/lib/constants";
import Link from "next/link";
import { WhatsAppJoinLink } from "@/features/community/components/WhatsAppJoinLink";

function isRealUrl(val?: string | null) {
  if (!val?.trim()) return false;
  return !/YOUR_|placeholder|change-me|example/i.test(val);
}

export default function AboutPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  const hasWhatsapp = isRealUrl(whatsapp);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">عن {BRAND}</h1>
      <p className="text-[var(--text-primary)] leading-relaxed">
        اسم <strong>{BRAND}</strong> من Gaza و«زميل».
      </p>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
        {TAGLINE_AR} مبادرة فردية لطلاب كلية الهندسة وتكنولوجيا المعلومات — الجامعة الإسلامية.
        نجمع الملخصات، التقويم، والاختبارات، مع بوت تيليجرام للتذكير وموافقة المساهمات.
      </p>
      <div className="card-soft p-5 text-sm leading-relaxed text-[var(--text-primary)]">
        <strong className="text-[var(--accent-gold)]">تنويه مهم</strong>
        <p className="mt-2">{DISCLAIMER_AR}</p>
      </div>
      <div className="card-soft p-5 text-sm space-y-2">
        <h2 className="font-semibold text-[var(--accent-gold)]">مجتمع واتساب</h2>
        <p className="text-[var(--text-secondary)]">
          للإعلانات السريعة والنقاش اليومي بين الطلاب (بدون أتمتة API في الـ MVP).
          الانضمام بعد إكمال التسجيل فقط.
        </p>
        {hasWhatsapp ? (
          <WhatsAppJoinLink href={whatsapp!} className="btn-primary inline-block">
            انضم لمجموعة واتساب
          </WhatsAppJoinLink>
        ) : (
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
            الرابط غير مضبوط بعد. ضع{" "}
            <code className="text-[var(--accent-gold)]">NEXT_PUBLIC_WHATSAPP_URL</code> في{" "}
            <code>.env.local</code> — التفاصيل في{" "}
            <code>docs/درس-المرحلة-3.md</code> أو{" "}
            <code>docs/الربط-السريع.md</code>.
          </p>
        )}
      </div>
      <p className="text-sm flex flex-wrap gap-4">
        <Link href="/telegram" className="text-[var(--accent-gold)] underline">
          ربط حساب تيليجرام للتذكيرات
        </Link>
        <Link href="/contributors" className="text-[var(--accent-gold)] underline">
          المساهمون
        </Link>
      </p>
    </div>
  );
}
