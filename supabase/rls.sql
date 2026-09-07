-- ============================================================
-- Gazameel — سياسات أمان الصفوف (RLS)
-- نفّذ بعد schema.sql في: Supabase → SQL Editor
-- ============================================================
-- الفكرة:
--   • الطالب يقرأ المواد المعتمدة (approved) فقط
--   • يرى مساهماته الخاصة بأي حالة (pending/rejected)
--   • الأدمن يقرأ الكل عبر وجود is_admin في profiles
--   • عمليات الموافقة/الرفض/الرفع الحساسة تمر عبر
--     service_role من الـ API (تتجاوز RLS) — هذا متعمّد
--   • لا يستطيع الطالب ترقية نفسه إلى is_admin من العميل
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.student_courses enable row level security;
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

-- إزالة سياسات قديمة بنفس الأسماء (آمن للتكرار)
drop policy if exists "courses_read" on public.courses;
drop policy if exists "courses_read_all" on public.courses;
drop policy if exists "profiles_read_own" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "student_courses_own" on public.student_courses;
drop policy if exists "resources_read_approved" on public.resources;
drop policy if exists "resources_insert_own" on public.resources;
drop policy if exists "feed_read" on public.updates_feed;
drop policy if exists "exams_read" on public.exam_events;
drop policy if exists "questions_read" on public.questions;
drop policy if exists "quiz_own" on public.quiz_attempts;
drop policy if exists "quiz_read_own" on public.quiz_attempts;
drop policy if exists "quiz_insert_own" on public.quiz_attempts;
drop policy if exists "polls_read" on public.polls;
drop policy if exists "poll_votes_own" on public.poll_votes;
drop policy if exists "poll_votes_read_own" on public.poll_votes;
drop policy if exists "poll_votes_insert_own" on public.poll_votes;
drop policy if exists "admin_messages_read_audience" on public.admin_messages;
drop policy if exists "user_message_reads_select_own" on public.user_message_reads;
drop policy if exists "user_message_reads_insert_own" on public.user_message_reads;

-- المواد: الجميع يقرأ قائمة الفصل
create policy "courses_read_all" on public.courses
  for select using (true);

-- الملف الشخصي
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- الإدراج: لا تسمح بتعيين is_admin من العميل
create policy "profiles_upsert_own" on public.profiles
  for insert with check (
    auth.uid() = id
    and coalesce(is_admin, false) = false
  );

-- التحديث: المستخدم يعدّل صفّه لكن لا يغيّر is_admin
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
  );

-- مواد الطالب المختارة
create policy "student_courses_own" on public.student_courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- الموارد: approved للجميع؛ المالك يرى ملفاته؛ الأدمن يرى الكل
create policy "resources_read_approved" on public.resources
  for select using (
    status = 'approved'
    or uploaded_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "resources_insert_own" on public.resources
  for insert with check (
    auth.uid() = uploaded_by
    and status = 'pending'
  );

-- Feed: قراءة عامة (الصفحة الرئيسية)
create policy "feed_read" on public.updates_feed
  for select using (true);

-- التقويم: قراءة للمسجّلين
create policy "exams_read" on public.exam_events
  for select using (auth.uid() is not null);

-- أسئلة الكويز
create policy "questions_read" on public.questions
  for select using (active = true);

-- محاولات الكويز: قراءة + إدراج فقط (لا تعديل/حذف للنتيجة من العميل)
create policy "quiz_read_own" on public.quiz_attempts
  for select using (auth.uid() = user_id);

create policy "quiz_insert_own" on public.quiz_attempts
  for insert with check (auth.uid() = user_id);

create policy "polls_read" on public.polls
  for select using (active = true);

-- أصوات الاستطلاع: صوت واحد (PK) + لا حذف/تعديل من العميل لإعادة التصويت
create policy "poll_votes_read_own" on public.poll_votes
  for select using (auth.uid() = user_id);

create policy "poll_votes_insert_own" on public.poll_votes
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- حماية إضافية: منع تغيير is_admin حتى لو تغيّرت السياسات
-- الترقية تتم فقط عبر service_role من السيرفر (features/auth/auth.ts)
-- ============================================================
create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- إذا حاول العميل تغيير is_admin، أعد القيمة القديمة
  if new.is_admin is distinct from old.is_admin then
    -- السماح فقط عندما يكون الدور الحالي service_role (تجاوز عبر JWT claim)
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_admin on public.profiles;
create trigger trg_protect_profile_admin
  before update on public.profiles
  for each row execute procedure public.protect_profile_admin_flag();

-- telegram_link_tokens: بدون سياسات للـ authenticated —
-- الوصول فقط عبر service_role من السيرفر (إنشاء/استهلاك التوكن)

alter table public.admin_messages enable row level security;
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

create policy "user_message_reads_select_own" on public.user_message_reads
  for select using (auth.uid() = user_id);

create policy "user_message_reads_insert_own" on public.user_message_reads
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- ملاحظة Storage (ليست SQL):
-- أنشئ bucket اسمه resources واجعله Private من الواجهة.
-- التطبيق يطلب Signed URL من /api/resources/[id]/download
-- ============================================================
