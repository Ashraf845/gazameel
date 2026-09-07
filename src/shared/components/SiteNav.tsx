"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PRIMARY = [
  { href: "/", label: "الرئيسية" },
  { href: "/hub", label: "المكتبة" },
  { href: "/quiz", label: "اختبارات" },
  { href: "/upload", label: "رفع ملف", featured: true },
  { href: "/calendar", label: "التقويم" },
];

const MORE = [
  { href: "/polls", label: "استطلاعات" },
  { href: "/progress", label: "تقدمي" },
  { href: "/my-submissions", label: "مساهماتي" },
  { href: "/contributors", label: "مساهمون" },
  { href: "/telegram", label: "تيليجرام" },
  { href: "/about", label: "عن المنصة" },
];

export function SiteNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function closeMenus() {
    setOpen(false);
    setMoreOpen(false);
  }

  const extra = isAdmin ? [{ href: "/admin", label: "أدمن" }] : [];
  const all = [...PRIMARY, ...extra, ...MORE];

  function active(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const linkBase =
    "rounded px-2 py-1 hover:text-[var(--accent-gold)] hover:bg-[color-mix(in_srgb,var(--accent-gold)_8%,transparent)]";
  const linkActive =
    "text-[var(--accent-gold)] bg-[color-mix(in_srgb,var(--accent-gold)_10%,transparent)]";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`md:hidden text-sm text-[var(--text-secondary)] ${linkBase}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        القائمة
      </button>

      <nav className="hidden md:flex flex-wrap items-center gap-1 text-sm text-[var(--text-secondary)]">
        {PRIMARY.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={closeMenus}
            className={`${linkBase} ${
              l.featured
                ? "inline-flex items-center gap-1.5 border border-[var(--accent-gold)] text-[var(--text-primary)]"
                : ""
            } ${active(l.href) ? linkActive : ""}`}
          >
            {l.featured ? <UploadIcon /> : null}
            {l.label}
          </Link>
        ))}
        {extra.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={closeMenus}
            className={`${linkBase} ${active(l.href) ? linkActive : ""}`}
          >
            {l.label}
          </Link>
        ))}
        <div className="relative">
          <button
            type="button"
            className={linkBase}
            onClick={() => setMoreOpen((v) => !v)}
          >
            المزيد
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-40 border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-lg rounded-[4px]">
              {MORE.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMenus}
                  className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[color-mix(in_srgb,var(--accent-gold)_8%,transparent)]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {open && (
        <div className="absolute right-0 top-full z-50 w-full border-b border-[var(--border)] bg-[var(--bg-primary)] md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm text-[var(--text-secondary)]">
            {all.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMenus}
                className={`rounded px-2 py-2 ${linkBase} ${
                  l.href === "/upload"
                    ? "flex items-center gap-2 border border-[var(--accent-gold)] text-[var(--text-primary)]"
                    : ""
                } ${active(l.href) ? linkActive : ""}`}
              >
                {l.href === "/upload" ? <UploadIcon /> : null}
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-[var(--accent-gold)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 14v5h14v-5" />
    </svg>
  );
}
