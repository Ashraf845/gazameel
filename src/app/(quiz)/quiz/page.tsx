import { QuizPanel } from "@/features/quiz/components/QuizPanel";
import { loadCatalogCourses } from "@/features/hub/catalog";

export default async function QuizPage() {
  const courses = await loadCatalogCourses();
  return <QuizPanel courses={courses} />;
}
