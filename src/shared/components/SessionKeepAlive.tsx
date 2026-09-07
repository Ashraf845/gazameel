"use client";

/**
 * يبقي جلسة Supabase حيّة: يحدّث التوكن عند فتح التطبيق
 * ويعيد المحاولة عند رجوع التبويب للواجهة.
 */
import { useEffect } from "react";
import { createClient } from "@/shared/lib/supabase/client";

export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    void supabase.auth.startAutoRefresh();
    void supabase.auth.getSession();

    function onVisible() {
      if (document.visibilityState === "visible") {
        void supabase.auth.getSession();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.auth.stopAutoRefresh();
    };
  }, []);

  return null;
}
