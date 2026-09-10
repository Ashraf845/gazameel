-- ============================================================
-- Gazameel — ترقية قاعدة موجودة (مرة واحدة)
-- نفّذ في: Supabase → SQL Editor ثم نفّذ supabase/rls.sql
-- آمن للتكرار. المشاريع الجديدة تكتفي بـ schema.sql ثم rls.sql.
-- ============================================================

-- ------------------------------------------------------------
-- سجل بريد وإشعارات لوحة الأدمن
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- فهارس وواجهات أداء
-- ------------------------------------------------------------
create index if not exists resources_status_course_idx
  on public.resources (status, course_id);

create index if not exists resources_course_status_created_idx
  on public.resources (course_id, status, created_at desc);

create index if not exists resources_uploaded_by_created_idx
  on public.resources (uploaded_by, created_at desc);

create index if not exists resources_created_at_idx
  on public.resources (created_at desc);

create index if not exists updates_feed_created_idx
  on public.updates_feed (created_at desc);

create index if not exists exam_events_starts_idx
  on public.exam_events (starts_at);

create index if not exists exam_events_course_idx
  on public.exam_events (course_id);

create index if not exists questions_course_active_idx
  on public.questions (course_id, active);

create index if not exists questions_daily_idx
  on public.questions (active, daily_eligible);

create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at desc);

create index if not exists student_courses_course_idx
  on public.student_courses (course_id);

create index if not exists poll_votes_user_idx
  on public.poll_votes (user_id);

create or replace view public.course_approved_counts
with (security_invoker = true) as
select
  c.code,
  c.name_ar,
  c.name_en,
  c.course_type,
  count(r.id)::int as approved_count
from public.courses c
left join public.resources r
  on r.course_id = c.id and r.status = 'approved'
group by c.code, c.name_ar, c.name_en, c.course_type;

create or replace view public.contributor_stats
with (security_invoker = true) as
select
  coalesce(nullif(trim(contributor_display_name), ''), 'مساهم') as name,
  count(*)::int as file_count
from public.resources
where status = 'approved'
group by 1;

grant select on public.course_approved_counts to anon, authenticated;
grant select on public.contributor_stats to anon, authenticated;

create or replace view public.admin_dashboard_stats
with (security_invoker = true) as
select
  (select count(*)::int from public.profiles) as users,
  (select count(*)::int from public.profiles where onboarding_done = true) as onboarded,
  (select count(*)::int from public.profiles where telegram_chat_id is not null) as telegram,
  (select count(*)::int from public.profiles where is_admin = true) as admins,
  (select count(*)::int from public.resources where status = 'pending') as pending,
  (select count(*)::int from public.resources where status = 'approved') as approved,
  (select count(*)::int from public.quiz_attempts) as quiz_attempts,
  (select count(*)::int from public.questions where active = true) as questions,
  (select count(*)::int from public.exam_events) as exams;

grant select on public.admin_dashboard_stats to service_role;

-- ------------------------------------------------------------
-- إغلاق إجابات الكويز على العميل (حتى قبل إعادة تشغيل rls.sql)
-- ------------------------------------------------------------
drop policy if exists "questions_read" on public.questions;
revoke select, insert, update, delete on table public.questions from anon, authenticated;
grant all on table public.questions to postgres, service_role;

-- سياسات قديمة على توكن الربط كانت تستخدم auth.uid() لكل صف.
-- الجدول للسيرفر فقط — لا سياسات للعميل.
drop policy if exists "Users can insert their own link tokens" on public.telegram_link_tokens;
drop policy if exists "Users can view their own link tokens" on public.telegram_link_tokens;
revoke all on table public.telegram_link_tokens from anon, authenticated;
grant all on table public.telegram_link_tokens to postgres, service_role;

revoke all on table public.reminder_log from anon, authenticated;
grant all on table public.reminder_log to postgres, service_role;

-- نوع مورد: كتاب + تكليف + ترتيب العرض
alter table public.resources drop constraint if exists resources_resource_type_check;
alter table public.resources
  add constraint resources_resource_type_check
  check (resource_type in ('summary', 'past_exam', 'book', 'assignment', 'video', 'image', 'other'));

alter table public.resources drop column if exists type_rank;
alter table public.resources
  add column type_rank int
  generated always as (
    case resource_type
      when 'video' then 1
      when 'summary' then 2
      when 'book' then 3
      when 'assignment' then 4
      when 'past_exam' then 5
      when 'image' then 6
      else 7
    end
  ) stored;

create index if not exists resources_course_status_type_rank_idx
  on public.resources (course_id, status, type_rank, created_at desc);

-- إخفاء استطلاعات مكررة بنفس نص السؤال (يبقي الأقدم نشطًا)
update public.polls p
set active = false
where p.active = true
  and exists (
    select 1
    from public.polls older
    where older.active = true
      and older.id <> p.id
      and older.created_at < p.created_at
      and lower(trim(older.question)) = lower(trim(p.question))
  );

-- توحيد اسم نشر أشرف إلى فريق Gazameel في الصفوف القديمة
update public.resources
set contributor_display_name = 'فريق Gazameel'
where contributor_display_name is not null
  and (
    (contributor_display_name ilike '%أشرف%' and contributor_display_name ilike '%حبيب%')
    or (contributor_display_name ilike '%اشرف%' and contributor_display_name ilike '%حبيب%')
    or (contributor_display_name ilike '%ashraf%' and contributor_display_name ilike '%habib%')
  );

update public.updates_feed
set message = replace(message, 'أشرف محمد حبيب', 'فريق Gazameel')
where message like '%أشرف محمد حبيب%';

update public.updates_feed
set message = replace(message, 'اشرف محمد حبيب', 'فريق Gazameel')
where message like '%اشرف محمد حبيب%';

-- مواد إضافية للكتالوج
insert into public.courses (code, name_ar, name_en, course_type, semester_key, semester_label_ar, credit_hours) values
  ('ECOM2302', 'إلكترونيات (2)', 'Electronics (2)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('ECOM2401', 'برمجة حاسوب (1)', 'Computer Programming (1)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 4),
  ('MATH2303', 'كالكولاس (C)', 'Calculus (C)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('MATH3301', 'معادلات تفاضلية عادية', 'Ordinary Differential Equations', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('QURN4101', 'قرآن كريم (4)', 'Holy Quran (4)', 'university', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 1)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  course_type = excluded.course_type,
  semester_key = excluded.semester_key,
  semester_label_ar = excluded.semester_label_ar,
  credit_hours = excluded.credit_hours;

-- بعد هذا الملف: نفّذ supabase/rls.sql لتطبيق سياسات الصفوف كاملة.
-- مهم للأداء: rls.sql يغلّف auth.uid() بـ (select auth.uid()) حتى تُحسب
-- مرة لكل طلب بدل كل صف — بدون ذلك تبقى القراءة بطيئة مهما أضفت فهارس.
