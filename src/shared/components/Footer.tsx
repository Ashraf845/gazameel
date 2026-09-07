/**
 * تذييل مختصر — روابط فقط بدون نص طويل
 */
import { BRAND } from "@/shared/lib/constants";
import Link from "next/link";

export function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  const hasWhatsapp =
    !!whatsapp &&
    !/YOUR_|placeholder|change-me/i.test(whatsapp);

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 py-5 text-sm text-[var(--text-secondary)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="gold-text font-medium tracking-wide">{BRAND}</p>
        <p className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-[var(--text-primary)]">
            عن المنصة
          </Link>
          <Link href="/telegram" className="hover:text-[var(--text-primary)]">
            تيليجرام
          </Link>
          {hasWhatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)]"
            >
              واتساب
            </a>
          ) : null}
        </p>
      </div>
    </footer>
  );
}
