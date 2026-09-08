/**
 * مؤشر تحميل الصفحة أثناء انتظار المسار الجديد (Suspense).
 */
export function PageLoading({ label = "جارٍ التحميل" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-4 py-24"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="nav-loading-orb" aria-hidden />
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      <span className="nav-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
