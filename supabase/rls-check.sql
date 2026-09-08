-- ============================================================
-- Gazameel — فحص RLS (نفّذ في SQL Editor بعد أي جدول جديد)
-- أي صف يظهر هنا = ثغرة: الجدول مقروء/قابل للكتابة عبر الـ API العام.
-- ============================================================

-- 1) جداول بلا RLS مفعّلة
select
  c.relname as table_name,
  'RLS غير مفعّلة — نفّذ: alter table public.' || c.relname
    || ' enable row level security;' as fix
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by 1;

-- 2) جداول عليها RLS بلا أي سياسة، ومع ذلك ممنوحة للعميل
--    (RLS بلا سياسة يمنع كل شيء — إن كان مقصودًا فتجاهله،
--     وإلا فالجدول معطّل عمليًا على العميل)
select
  c.relname as table_name,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1 from pg_policy p where p.polrelid = c.oid
  )
order by 1;

-- 3) سياسات تستدعي auth.uid() بلا (select ...) — تُحسب لكل صف
select
  schemaname,
  tablename,
  policyname,
  'غلّف auth.uid() بـ (select auth.uid())' as fix
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ~ 'auth\.uid\(\)'
    or coalesce(with_check, '') ~ 'auth\.uid\(\)'
  )
  and not (
    coalesce(qual, '') ~ '\(\s*SELECT\s+auth\.uid\(\)'
    or coalesce(with_check, '') ~ '\(\s*SELECT\s+auth\.uid\(\)'
  )
order by 2, 3;
