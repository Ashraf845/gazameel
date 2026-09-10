-- ============================================================
-- Gazameel — مخطط قاعدة البيانات (مرحلة 1 + جداول لاحقة)
-- نفّذ هذا الملف أولًا في: Supabase → SQL Editor → New query → Run
-- ثم نفّذ: supabase/rls.sql
-- ============================================================
--
-- Storage (مهم — من الواجهة وليس من SQL):
--   1) Storage → New bucket
--   2) Name: resources
--   3) Public bucket: OFF (Private)
--   4) File size limit: 15MB (اختياري)
--   5) Allowed MIME: application/pdf, image/jpeg, image/png, image/webp
-- مسارات الملفات داخل الـ bucket:
--   pending/{user_id}/{uuid}.ext   ← مساهمات بانتظار المراجعة
--   approved/{course_id}/{uuid}.ext ← رفع أدمن مباشر / ملفات معتمدة
-- لا تضع روابط عامة دائمة لملفات pending — التطبيق يستخدم Signed URL.
--
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- المواد الدراسية (قائمة فصل دراسي واحد في الإطلاق)
-- semester_key: معرّف الفصل — مثال level2-sem1 = المستوى 2 فصل 1
-- ------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  -- university=جامعة | college=كلية | major=تخصص
  course_type text,
  -- مفتاح الفصل الدراسي (للتصفية لاحقًا إن أضفت فصولًا أخرى)
  semester_key text not null default 'level2-sem1',
  semester_label_ar text not null default 'المستوى الثاني — الفصل الأول',
  credit_hours int,
  created_at timestamptz default now()
);

alter table public.courses add column if not exists course_type text;
alter table public.courses add column if not exists semester_key text;
alter table public.courses add column if not exists semester_label_ar text;
alter table public.courses add column if not exists credit_hours int;

update public.courses
set
  semester_key = coalesce(semester_key, 'level2-sem1'),
  semester_label_ar = coalesce(semester_label_ar, 'المستوى الثاني — الفصل الأول')
where semester_key is null or semester_label_ar is null;

-- الأعمدة مضمونة الوجود أعلاه — طبّق الـ defaults صراحة بدون ابتلاع أخطاء
alter table public.courses
  alter column semester_key set default 'level2-sem1';
alter table public.courses
  alter column semester_label_ar set default 'المستوى الثاني — الفصل الأول';

do $$ begin
  alter table public.courses
    add constraint courses_course_type_check
    check (course_type in ('university', 'college', 'major'));
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- ملفات الطلاب (profiles) — تُنشأ تلقائيًا عند تسجيل Google
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  student_id text,
  major text,
  is_admin boolean default false,
  onboarding_done boolean default false,
  telegram_chat_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- منع ربط نفس chat_id أو الرقم الجامعي بأكثر من حساب (NULL مسموح لعدة صفوف)
-- إن فشل الفهرس على قاعدة موجودة: نظّف التكرارات أولًا ثم أعد التنفيذ
create unique index if not exists profiles_telegram_chat_id_uidx
  on public.profiles (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists profiles_student_id_uidx
  on public.profiles (student_id)
  where student_id is not null;

-- مواد يختارها الطالب في onboarding
create table if not exists public.student_courses (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  primary key (user_id, course_id)
);

-- ------------------------------------------------------------
-- الموارد (ملفات المكتبة) — pending → approved | rejected
-- ------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  title text not null,
  description text,
  resource_type text not null default 'summary'
    check (resource_type in ('summary', 'past_exam', 'book', 'assignment', 'video', 'image', 'other')),
  storage_path text,
  mime_type text,
  file_size bigint,
  external_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  contributor_display_name text,
  uploaded_by uuid references public.profiles(id),
  rejection_reason text,
  source_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- ترتيب العرض في المكتبة: فيديو → ملخص → كتاب → تكليف…
alter table public.resources
  add column if not exists type_rank int
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

-- آخر التحديثات (الصفحة الرئيسية)
create table if not exists public.updates_feed (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  resource_id uuid references public.resources(id) on delete set null,
  created_at timestamptz default now()
);

-- تقويم الامتحانات
create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  title text not null,
  event_type text not null check (event_type in ('quiz', 'midterm', 'final', 'assignment')),
  starts_at timestamptz not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- جداول مراحل لاحقة (آمنة للتنفيذ الآن — لا تؤذي المرحلة 1)
-- ------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  topic text,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct text not null check (correct in ('A', 'B', 'C', 'D')),
  explanation text,
  active boolean default true,
  daily_eligible boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  score int not null,
  total int not null,
  answers jsonb not null default '[]',
  created_at timestamptz default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id),
  question text not null,
  options jsonb not null,
  active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.poll_votes (
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  option_index int not null,
  created_at timestamptz default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  exam_event_id uuid not null references public.exam_events(id) on delete cascade,
  window_label text not null,
  sent_at timestamptz default now(),
  unique (exam_event_id, window_label)
);

-- توكن لمرة واحدة لربط تيليجرام (بدل تمرير user UUID في الرابط)
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

-- رسائل الأدمن: بريد + إشعارات (سجل لوحة التحكم)
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

-- ------------------------------------------------------------
-- بذرة مواد الفصل (كتالوج المنصة)
-- ------------------------------------------------------------
insert into public.courses (code, name_ar, name_en, course_type, semester_key, semester_label_ar, credit_hours) values
  ('ARAB1202', 'اللغة العربية (نحو وصرف)', 'Arabic Language (Grammar and Morphology)', 'university', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 2),
  ('ECOM1401', 'برمجة حاسوب (1)', 'Computer Programming (1)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 4),
  ('ECOM2306', 'إلكترونيات (2)', 'Electronics (2)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('ECOM2311', 'رياضيات متقطعة', 'Discrete Mathematics', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('ECOM2402', 'برمجة حاسوب (2)', 'Computer Programming (2)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 4),
  ('ENGG1209', 'رسم هندسي بالحاسوب', 'Computer-Aided Engineering Drawing', 'college', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 2),
  ('ENGG1305', 'لغة إنجليزية تقنية', 'Technical English', 'college', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('MATH2301', 'كالكولاس (C)', 'Calculus (C)', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('MATH2302', 'معادلات تفاضلية عادية', 'Ordinary Differential Equations', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('MATH2341', 'جبر خطي', 'Linear Algebra', 'major', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 3),
  ('QURN3101', 'قرآن كريم (3)', 'Holy Quran (3)', 'university', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 1),
  ('QURN4102', 'قرآن كريم (4)', 'Holy Quran (4)', 'university', 'level2-sem1', 'المستوى الثاني — الفصل الأول', 1)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  course_type = excluded.course_type,
  semester_key = excluded.semester_key,
  semester_label_ar = excluded.semester_label_ar,
  credit_hours = excluded.credit_hours;

-- إنشاء بروفايل تلقائي عند أول تسجيل Google
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- تفعيل RLS (السياسات التفصيلية في rls.sql)
-- إلزامي: أي جدول جديد يُضاف هنا بسطر enable row level security فور إنشائه،
-- وإلا بقي مفتوحًا عبر الـ API. تحقّق بعد كل إضافة: supabase/rls-check.sql
alter table public.profiles enable row level security;
alter table public.student_courses enable row level security;
alter table public.courses enable row level security;
alter table public.resources enable row level security;
alter table public.updates_feed enable row level security;
alter table public.exam_events enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.reminder_log enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.admin_messages enable row level security;
alter table public.user_message_reads enable row level security;

create index if not exists resources_status_course_idx
  on public.resources (status, course_id);

create index if not exists resources_course_status_created_idx
  on public.resources (course_id, status, created_at desc);

create index if not exists resources_course_status_type_rank_idx
  on public.resources (course_id, status, type_rank, created_at desc);

create index if not exists resources_uploaded_by_created_idx
  on public.resources (uploaded_by, created_at desc);

create index if not exists updates_feed_created_idx
  on public.updates_feed (created_at desc);

create index if not exists exam_events_starts_idx
  on public.exam_events (starts_at);

create index if not exists questions_course_active_idx
  on public.questions (course_id, active);

create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts (user_id, created_at desc);

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

-- انتهى schema.sql — نفّذ الآن supabase/rls.sql
-- قاعدة موجودة مسبقًا: نفّذ supabase/upgrade.sql ثم rls.sql
