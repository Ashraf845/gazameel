"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PRIMARY = [
  { href: "/", label: "الرئيسية" },
  { href: "/hub", label: "المكتبة" },
  { href: "/quiz", label: "اختبارات" },
  { href: "/upload", label: "ساهم" },
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

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

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
            className={`${linkBase} ${active(l.href) ? linkActive : ""}`}
          >
            {l.label}
          </Link>
        ))}
        {extra.map((l) => (
          <Link
            key={l.href}
            href={l.href}
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
                className={`rounded px-2 py-2 ${linkBase} ${
                  active(l.href) ? linkActive : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
