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

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      createClient()?.auth.getSession();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      createClient()?.auth.stopAutoRefresh();
    };
  }, []);

  return null;
}
