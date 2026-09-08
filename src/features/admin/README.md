# admin

لوحة التحكم: `dashboard.ts` (إحصائيات ومستخدمون) و`email.ts` (بث البريد عبر Resend).
المكوّنات: `DashboardPanel`, `UsersMailPanel`, `NotificationsPanel`, `QueuePanel`, `DirectUploadPanel`, `ExamsPanel`, `QuestionsPanel`, `PollsAdminPanel`.
الصفحة: `/admin` — APIs: `/api/admin/dashboard`, `/api/admin/messages`.
سجل الإعلانات وصندوق المستخدم: `admin_messages` و`user_message_reads`
(`supabase/upgrade.sql` ثم `rls.sql`).
