/**
 * عمل خلفي بعد إرجاع الاستجابة — لا يُبقي المستخدم منتظرًا.
 * يُستخدم للإشعارات (تيليجرام/بريد) بعد نجاح الكتابة الأساسية.
 */
import { after } from "next/server";

/** سقف زمني للمهمة الخلفية حتى لا تبقى دالة Serverless مفتوحة على شبكة معلّقة */
const DEFAULT_BUDGET_MS = 8000;

export function runAfterResponse(
  task: () => Promise<unknown>,
  budgetMs = DEFAULT_BUDGET_MS
): void {
  const safe = async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        task(),
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            console.error("[background] تجاوز المهلة", budgetMs);
            resolve();
          }, budgetMs);
        }),
      ]);
    } catch (e) {
      console.error("[background]", e);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    after(safe);
  } catch {
    // خارج سياق طلب Next — نفّذ بدون انتظار
    void safe();
  }
}
