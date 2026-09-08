/**
 * كتالوج المواد للواجهة. المصدر التشغيلي عند ربط قاعدة البيانات هو جدول courses.
 * هذه القائمة احتياط عند غياب Supabase، ويجب أن تطابق بذرة schema.sql.
 */

export type CourseType = "university" | "college" | "major";

export type CatalogCourse = {
  code: string;
  name: string;
  name_ar: string;
  name_en?: string;
  course_type: CourseType;
};

export function toCatalogCourse(row: {
  code: string;
  name_ar: string;
  name_en?: string | null;
  course_type?: string | null;
}): CatalogCourse {
  const course_type: CourseType =
    row.course_type === "university" ||
    row.course_type === "college" ||
    row.course_type === "major"
      ? row.course_type
      : "major";
  return {
    code: row.code,
    name: row.name_ar,
    name_ar: row.name_ar,
    name_en: row.name_en ?? undefined,
    course_type,
  };
}

/** يجب أن يطابق semester_key / semester_label_ar في schema.sql */
export const SEMESTER_KEY = "level2-sem1";
export const SEMESTER_LABEL_AR = "المستوى الثاني — الفصل الأول";

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  university: "جامعة",
  college: "كلية",
  major: "تخصص",
};

export const COURSES = [
  {
    code: "ARAB1202",
    name: "اللغة العربية (نحو وصرف)",
    name_ar: "اللغة العربية (نحو وصرف)",
    name_en: "Arabic Language (Grammar and Morphology)",
    course_type: "university" as const,
  },
  {
    code: "ECOM2311",
    name: "رياضيات متقطعة",
    name_ar: "رياضيات متقطعة",
    name_en: "Discrete Mathematics",
    course_type: "major" as const,
  },
  {
    code: "ECOM2402",
    name: "برمجة حاسوب (2)",
    name_ar: "برمجة حاسوب (2)",
    name_en: "Computer Programming (2)",
    course_type: "major" as const,
  },
  {
    code: "ENGG1209",
    name: "رسم هندسي بالحاسوب",
    name_ar: "رسم هندسي بالحاسوب",
    name_en: "Computer-Aided Engineering Drawing",
    course_type: "college" as const,
  },
  {
    code: "ENGG1305",
    name: "لغة إنجليزية تقنية",
    name_ar: "لغة إنجليزية تقنية",
    name_en: "Technical English",
    course_type: "college" as const,
  },
  {
    code: "MATH2341",
    name: "جبر خطي",
    name_ar: "جبر خطي",
    name_en: "Linear Algebra",
    course_type: "major" as const,
  },
  {
    code: "QURN3101",
    name: "قرآن كريم (3)",
    name_ar: "قرآن كريم (3)",
    name_en: "Holy Quran (3)",
    course_type: "university" as const,
  },
] as const;

/** توافق مع الاستيرادات القديمة */
export const COURSE_OPTIONS = COURSES;

export const RESOURCE_TYPES = [
  { value: "summary", label: "ملخص" },
  { value: "past_exam", label: "أسئلة سنوات" },
  { value: "video", label: "فيديو (رابط)" },
  { value: "image", label: "صورة" },
  { value: "other", label: "أخرى" },
] as const;

export type ResourceTypeValue = (typeof RESOURCE_TYPES)[number]["value"];

export function isAllowedResourceType(value: string): value is ResourceTypeValue {
  return RESOURCE_TYPES.some((t) => t.value === value);
}
