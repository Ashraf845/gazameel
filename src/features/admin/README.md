# admin

لوحة التحكم: `dashboard.ts` (إحصائيات ومستخدمون) و`email.ts` (بث البريد عبر Resend).
المكوّنات: `components/DashboardPanel`, `UsersMailPanel`, `NotificationsPanel`.
الصفحة: `/admin` — APIs: `/api/admin/dashboard`, `/api/admin/messages`.
سجل الإعلانات وصندوق المستخدم: `admin_messages` و`user_message_reads`
(`supabase/admin_dashboard.sql`).
