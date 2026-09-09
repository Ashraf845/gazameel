/**
 * اسم المساهم الظاهر في المكتبة والتحديثات.
 * نشر أشرف (مؤسس المنصة) يظهر كـ «فريق Gazameel»؛ باقي الطلاب بأسمائهم.
 */
export function resolveContributorDisplayName(
  name: string | null | undefined,
  fallback = "طالب"
): string {
  const raw = (name || "").trim();
  if (!raw) return fallback;

  const compact = raw.replace(/\s+/g, " ").toLowerCase();
  const arabic = compact
    .replace(/أ|إ|آ/g, "ا")
    .replace(/ة/g, "ه");

  const isAshraf =
    (/اشرف/.test(arabic) && /حبيب/.test(arabic)) ||
    (/ashraf/.test(compact) && /habib/.test(compact));

  if (isAshraf) return "فريق Gazameel";
  return raw;
}
