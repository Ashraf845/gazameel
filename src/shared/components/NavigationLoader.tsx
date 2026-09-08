"use client";

/**
 * شريط + زر تحميل حيوي عند الانتقال بين الصفحات.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const delayRef = useRef<number | null>(null);

  useEffect(() => {
    setActive(false);
    if (delayRef.current) window.clearTimeout(delayRef.current);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      if (a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const href = a.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      if (delayRef.current) window.clearTimeout(delayRef.current);
      delayRef.current = window.setTimeout(() => setActive(true), 120);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (delayRef.current) window.clearTimeout(delayRef.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div className="nav-loading-layer" role="status" aria-live="polite" aria-label="جارٍ التحميل">
      <div className="nav-progress" aria-hidden />
      <div className="nav-loading-btn">
        <span className="nav-loading-orb nav-loading-orb--sm" aria-hidden />
        <span>جارٍ التحميل</span>
        <span className="nav-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
