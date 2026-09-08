"use client";

/**
 * جلسة المتصفح مرة واحدة لكل صفحة — AuthNav و SiteNav و WelcomeBanner
 * يشتركون في نفس getSession + profiles بدل طلب منفصل لكل مكوّن.
 */
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/shared/lib/supabase/client";

export type ClientProfile = {
  full_name: string | null;
  student_id: string | null;
  is_admin: boolean;
  onboarding_done: boolean;
  telegram_chat_id: string | null;
};

export type ClientAuthState = {
  user: User | null;
  profile: ClientProfile | null;
};

type Listener = (state: ClientAuthState) => void;

let inflight: Promise<ClientAuthState> | null = null;
let cached: ClientAuthState | null = null;
let listening = false;
const listeners = new Set<Listener>();

function mapProfile(row: {
  full_name?: string | null;
  student_id?: string | null;
  is_admin?: boolean | null;
  onboarding_done?: boolean | null;
  telegram_chat_id?: string | null;
} | null): ClientProfile | null {
  if (!row) return null;
  return {
    full_name: row.full_name ?? null,
    student_id: row.student_id ?? null,
    is_admin: !!row.is_admin,
    onboarding_done: !!row.onboarding_done,
    telegram_chat_id: row.telegram_chat_id ?? null,
  };
}

async function fetchAuth(): Promise<ClientAuthState> {
  const supabase = createClient();
  if (!supabase) return { user: null, profile: null };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, student_id, is_admin, onboarding_done, telegram_chat_id"
    )
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile: mapProfile(profile) };
}

export function loadClientAuth(): Promise<ClientAuthState> {
  if (inflight) return inflight;
  if (cached) return Promise.resolve(cached);
  inflight = fetchAuth()
    .then((state) => {
      cached = state;
      return state;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function ensureAuthListener() {
  if (listening) return;
  listening = true;
  const supabase = createClient();
  supabase?.auth.onAuthStateChange((event) => {
    if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
    inflight = null;
    cached = null;
    const next = loadClientAuth();
    listeners.forEach((listener) => {
      void next.then(listener);
    });
  });
}

export function subscribeClientAuth(listener: Listener): () => void {
  listeners.add(listener);
  ensureAuthListener();
  void loadClientAuth().then(listener);
  return () => {
    listeners.delete(listener);
  };
}
