/**
 * تنويه بيانات تجريبية (كويز / تقويم) حتى تكتمل المصادر.
 */
export function DataPreviewNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-[var(--warn)]/40 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)]"
    >
      <p className="font-medium text-[var(--warn)]">تنويه</p>
      <p className="mt-1 text-[var(--text-secondary)]">{children}</p>
    </div>
  );
}
