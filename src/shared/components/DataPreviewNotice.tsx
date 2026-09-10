/**
 * تنويه بيانات تجريبية (كويز / تقويم) حتى تكتمل المصادر.
 */
export function DataPreviewNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mb-6 rounded-lg border-2 border-[var(--accent-gold)] bg-[color-mix(in_srgb,var(--accent-gold)_14%,transparent)] px-4 py-3 text-sm leading-relaxed"
    >
      <p className="font-semibold text-[var(--accent-gold)]">تنويه</p>
      <p className="mt-1 text-[var(--text-primary)]">{children}</p>
    </div>
  );
}
