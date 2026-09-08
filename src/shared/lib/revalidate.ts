/**
 * تفريغ كاش الصفحات العامة عند تغيّر المحتوى المعتمد فقط.
 * بدونه تبقى `revalidate` الزمنية وحدها، فيتأخر ظهور الملف الجديد،
 * ومع زحام الزوار يُعاد التجميع لحظة انتهاء المهلة.
 */
import { revalidatePath } from "next/cache";

function revalidateAll(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (e) {
      // خارج سياق طلب (سكربت/cron) — الكاش يتجدد بالمهلة الزمنية
      console.error("[revalidate]", path, e);
    }
  }
}

/** بعد اعتماد ملف أو نشره مباشرة من الإدارة */
export function revalidatePublicContent(courseCode?: string | null) {
  const paths = ["/", "/hub", "/contributors"];
  if (courseCode) paths.push(`/hub/${courseCode}`);
  revalidateAll(paths);
}

/** بعد إضافة أو تعديل موعد امتحان */
export function revalidateCalendar() {
  revalidateAll(["/", "/calendar", "/countdown"]);
}
