/**
 * أنواع TypeScript المشتركة للمنصة
 * تساعدنا نفهم شكل البيانات القادمة من Supabase
 */

/** حالات الملف في مسار المراجعة */
export type ResourceStatus = "pending" | "approved" | "rejected";

/** أنواع الموارد الدراسية */
export type ResourceType =
  | "summary"
  | "past_exam"
  | "book"
  | "assignment"
  | "video"
  | "image"
  | "other";

export type ExamEventType = "quiz" | "midterm" | "final" | "assignment";

export type CourseType = "university" | "college" | "major";

export type Course = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  course_type?: CourseType | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  student_id: string | null;
  major: string | null;
  is_admin: boolean;
  onboarding_done: boolean;
};

export type Resource = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  storage_path: string | null;
  external_url: string | null;
  status: ResourceStatus;
  contributor_display_name: string | null;
  uploaded_by: string | null;
  rejection_reason: string | null;
  source_note: string | null;
  created_at: string;
};
