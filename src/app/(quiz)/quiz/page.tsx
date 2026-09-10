import { QuizPanel } from "@/features/quiz/components/QuizPanel";
import { loadCatalogCourses } from "@/features/hub/catalog";
import { DataPreviewNotice } from "@/shared/components/DataPreviewNotice";

export default async function QuizPage() {
  const courses = await loadCatalogCourses();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
        اختبار تفاعلي
      </h1>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        اختر المادة ثم الفصل (الشابتر). كل سؤال لمدة دقيقة واحدة.
      </p>
      <DataPreviewNotice>
        أسئلة الاختبارات ما زالت تجريبية وقد لا تغطي الكتاب كاملًا — نحدّثها
        تدريجيًا حتى تكتمل البيانات.
      </DataPreviewNotice>
      <QuizPanel courses={courses} />
    </div>
  );
}
