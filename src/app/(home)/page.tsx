/**
 * الصفحة الرئيسية — quiet luxury: هيرو + ثلاث ميزات
 */
import Link from "next/link";
import { BRAND, TAGLINE_AR, TAGLINE_EN } from "@/shared/lib/constants";
import { isSupabaseConfigured } from "@/shared/lib/supabase/config";
import { SupabaseSetupBanner } from "@/shared/components/SupabaseSetupNotice";
import { getSessionUser } from "@/features/auth/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser() : null;

  return (
    <div>
      {!configured && <SupabaseSetupBanner />}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 hero-olive" aria-hidden>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 700 400"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern
                id="olive"
                width="120"
                height="90"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M10 60 Q35 30 60 45 Q85 60 110 35"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <ellipse
                  cx="28"
                  cy="47"
                  rx="7"
                  ry="4"
                  fill="currentColor"
                  transform="rotate(-25 28 47)"
                />
                <ellipse
                  cx="48"
                  cy="38"
                  rx="7"
                  ry="4"
                  fill="currentColor"
                  transform="rotate(-10 48 38)"
                />
                <ellipse
                  cx="68"
                  cy="42"
                  rx="7"
                  ry="4"
                  fill="currentColor"
                  transform="rotate(15 68 42)"
                />
                <ellipse
                  cx="88"
                  cy="38"
                  rx="7"
                  ry="4"
                  fill="currentColor"
                  transform="rotate(-15 88 38)"
                />
              </pattern>
            </defs>
            <rect width="700" height="400" fill="url(#olive)" />
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center md:py-32">
          <div className="brand-rule mb-5" />
          <p className="gold-text-shine mb-3 text-sm font-medium uppercase tracking-[0.28em]">
            {BRAND}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-6xl">
            {TAGLINE_AR}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[var(--text-secondary)]">
            {TAGLINE_EN}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/hub" className="cta-button">
              ادخل المكتبة
            </Link>
            {!user && (
              <Link href="/login" className="btn-ghost">
                دخول Google
              </Link>
            )}
            <Link href="/upload" className="btn-ghost">
              ساهم بملخص
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="feature-rail grid md:grid-cols-3">
          <Feature
            title="اختبارات"
            body="كويز فوري مع تصحيح فوري وتتبع تقدّمك."
            href="/quiz"
            icon="quiz"
          />
          <Feature
            title="مراجعة"
            body="ارفع ملخصًا → قيد المراجعة → موافقة من الويب أو تيليجرام."
            href="/upload"
            icon="upload"
          />
          <Feature
            title="مكتبة"
            body="ملخصات وأسئلة سنوات معتمدة فقط تظهر بعد موافقة الأدمن."
            href="/hub"
            icon="library"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureIcon({ name }: { name: "quiz" | "upload" | "library" }) {
  const props = {
    width: 36,
    height: 36,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  return (
    <span className="mb-4 text-[var(--accent-gold)]" aria-hidden>
      {name === "quiz" && (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9.2a2.9 2.9 0 1 1 4.1 2.6c-.7.4-1.2 1-1.2 1.9" />
          <path d="M12 17.2h.01" />
        </svg>
      )}
      {name === "upload" && (
        <svg {...props}>
          <path d="M12 15V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      )}
      {name === "library" && (
        <svg {...props}>
          <path d="M4 19V5a1 1 0 0 1 1-1h3v16H5a1 1 0 0 1-1-1z" />
          <path d="M8 4h7a1 1 0 0 1 1 1v14H8V4z" />
          <path d="M16 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" />
        </svg>
      )}
    </span>
  );
}

function Feature({
  title,
  body,
  href,
  icon,
}: {
  title: string;
  body: string;
  href: string;
  icon: "quiz" | "upload" | "library";
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center p-8 text-center transition hover:bg-[color-mix(in_srgb,var(--accent-gold)_5%,transparent)]"
    >
      <FeatureIcon name={icon} />
      <div className="brand-rule mb-4" />
      <h2 className="gold-text mb-2 text-xl font-semibold">
        {title}
      </h2>
      <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>
    </Link>
  );
}
