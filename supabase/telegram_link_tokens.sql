-- ============================================================
-- Gazameel — ترقية: جدول توكنات ربط تيليجرام
-- آمن للتكرار (idempotent) — نفّذه على أي قاعدة قديمة بضغطة واحدة
-- في: Supabase → SQL Editor → Run
-- ============================================================
-- الغرض: استبدال deep link الذي كان يمرّر user UUID
-- بـ توكن عشوائي لمرة واحدة (انظر features/automations/telegram.ts)
-- ============================================================

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists telegram_link_tokens_user_id_idx
  on public.telegram_link_tokens (user_id);

create index if not exists telegram_link_tokens_expires_idx
  on public.telegram_link_tokens (expires_at);

-- بدون سياسات لـ authenticated: الوصول فقط عبر service_role من السيرفر
alter table public.telegram_link_tokens enable row level security;

-- انتهى — أعد فتح /telegram لإنشاء رابط الربط
