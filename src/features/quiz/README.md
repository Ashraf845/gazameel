# quiz

منطق الاختبار: `quiz.ts` (بدء/تسليم عبر السيرفر) و `grading.ts` (خلط الأسئلة وتصحيحها بلا كشف `correct`).
المكوّن: `components/QuizPanel`.
الصفحات: `/quiz` و `/progress`. APIs: `/api/quiz/start`, `/api/quiz/submit`, `/api/admin/questions`.
جدول `questions` بلا سياسة SELECT للعميل — الإجابات فقط عبر service_role.
