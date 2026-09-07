/** حالة ودّية عند غياب إعدادات Supabase */
export function SupabaseSetupNotice({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
        {detail ||
          "المنصة تعمل بمعاينة محلية، لكن اتصال قاعدة البيانات غير مُعدّ بعد."}
      </p>
      <ol className="mb-4 list-decimal space-y-2 pr-5 text-sm text-[var(--text-secondary)] leading-relaxed">
        <li>
          انسخ{" "}
          <code className="text-[var(--accent-gold)]">.env.example</code> إلى{" "}
          <code className="text-[var(--accent-gold)]">.env.local</code> (موجود مسبقًا
          بـ placeholders).
        </li>
        <li>
          الصق من Supabase → Project Settings → API القيم:{" "}
          <code className="text-[var(--accent-gold)]">NEXT_PUBLIC_SUPABASE_URL</code> و{" "}
          <code className="text-[var(--accent-gold)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          و{" "}
          <code className="text-[var(--accent-gold)]">SUPABASE_SERVICE_ROLE_KEY</code>.
        </li>
        <li>
          نفّذ{" "}
          <code className="text-[var(--accent-gold)]">supabase/schema.sql</code> ثم{" "}
          <code className="text-[var(--accent-gold)]">supabase/rls.sql</code> وأنشئ bucket{" "}
          <code className="text-[var(--accent-gold)]">resources</code> (Private).
        </li>
        <li>أعد تشغيل الخادم المحلي.</li>
      </ol>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
        الشرح التفصيلي نقرًا بنقرة:{" "}
        <code className="text-[var(--accent-gold)]">docs/درس-المرحلة-1.md</code>
      </p>
    </div>
  );
}

/** شريط خفيف أعلى الصفحة عند غياب الإعداد */
export function SupabaseSetupBanner() {
  const isPreview =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

  if (isPreview) {
    return (
      <div className="border-b border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-3 text-center text-sm text-[var(--warn)]">
        هذا رابط <strong>Preview</strong> بدون مفاتيح قاعدة البيانات. افتح الإنتاج:{" "}
        <a
          href="https://gazameel.vercel.app"
          className="underline text-[var(--text-primary)]"
        >
          gazameel.vercel.app
        </a>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-3 text-center text-sm text-[var(--warn)]">
      مفاتيح Supabase ناقصة — على Vercel أضف{" "}
      <code className="text-[var(--text-primary)]">NEXT_PUBLIC_SUPABASE_URL</code> و{" "}
      <code className="text-[var(--text-primary)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
      كـ Config ثم Redeploy. محليًا راجع{" "}
      <code className="text-[var(--text-primary)]">.env.local</code>.
    </div>
  );
}
