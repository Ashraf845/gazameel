-- ============================================================
-- Gazameel — ترقية: سجل بريد وإشعارات لوحة الأدمن
-- آمن للتكرار — نفّذه في: Supabase → SQL Editor → Run
-- ============================================================

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'notification')),
  title text not null,
  body text not null,
  audience text not null default 'all'
    check (audience in ('all', 'onboarded', 'telegram')),
  show_on_home boolean default false,
  sent_via_telegram boolean default false,
  telegram_sent int default 0,
  email_sent int default 0,
  email_failed int default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.admin_messages
  add column if not exists email_sent int default 0;
alter table public.admin_messages
  add column if not exists email_failed int default 0;

create index if not exists admin_messages_created_idx
  on public.admin_messages (created_at desc);

create table if not exists public.user_message_reads (
  message_id uuid references public.admin_messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

create index if not exists user_message_reads_user_idx
  on public.user_message_reads (user_id, read_at desc);

alter table public.admin_messages enable row level security;
alter table public.user_message_reads enable row level security;

drop policy if exists "admin_messages_read_audience" on public.admin_messages;
create policy "admin_messages_read_audience" on public.admin_messages
  for select using (
    auth.uid() is not null
    and kind = 'notification'
    and (
      audience = 'all'
      or (
        audience = 'onboarded'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.onboarding_done = true
        )
      )
      or (
        audience = 'telegram'
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.telegram_chat_id is not null
        )
      )
    )
  );

drop policy if exists "user_message_reads_select_own" on public.user_message_reads;
create policy "user_message_reads_select_own" on public.user_message_reads
  for select using (auth.uid() = user_id);

drop policy if exists "user_message_reads_insert_own" on public.user_message_reads;
create policy "user_message_reads_insert_own" on public.user_message_reads
  for insert with check (auth.uid() = user_id);
