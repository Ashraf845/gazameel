"use client";

import { WhatsAppJoinLink } from "@/features/community/components/WhatsAppJoinLink";

/**
 * تذييل الموقع — تصفح + قائمة المزيد (نفس روابط الشريط العلوي)
 */
import { BRAND, TAGLINE_AR } from "@/shared/lib/constants";
import { MORE_NAV, PRIMARY_NAV } from "@/shared/lib/nav";
import Link from "next/link";

function isRealUrl(val?: string | null) {
  if (!val?.trim()) return false;
  return !/YOUR_|placeholder|change-me|example/i.test(val);
}

export function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  const hasWhatsapp = isRealUrl(whatsapp);

  const linkClass =
    "block py-1 text-[var(--text-secondary)] hover:text-[var(--accent-gold)]";

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-surface)] text-sm">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="gold-text font-medium tracking-wide">{BRAND}</p>
          <p className="mt-2 max-w-xs text-[var(--text-secondary)] leading-relaxed">
            {TAGLINE_AR}
          </p>
        </div>

        <nav aria-label="تصفح">
          <h2 className="mb-3 font-semibold text-[var(--text-primary)]">تصفح</h2>
          <ul>
            {PRIMARY_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="المزيد">
          <h2 className="mb-3 font-semibold text-[var(--text-primary)]">المزيد</h2>
          <ul>
            {MORE_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            {hasWhatsapp ? (
              <li>
                <WhatsAppJoinLink href={whatsapp!} className={linkClass}>
                  قناة واتساب
                </WhatsAppJoinLink>
              </li>
            ) : null}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
