"use client";

/**
 * زر الوضع الليلي / الفاتح — أيقونة بدل نص
 */
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(localStorage.getItem("gazameel-theme") === "light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", light);
    localStorage.setItem("gazameel-theme", light ? "light" : "dark");
  }, [light]);

  return (
    <button
      type="button"
      onClick={() => setLight((v) => !v)}
      className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
      title={light ? "الوضع الداكن" : "الوضع الفاتح"}
      aria-label={light ? "الوضع الداكن" : "الوضع الفاتح"}
    >
      {light ? (
        /* moon — اضغط للرجوع للداكن */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 14.3A9 9 0 1 1 9.7 3 7 7 0 0 0 21 14.3z" />
        </svg>
      ) : (
        /* sun — اضغط للفاتح */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
