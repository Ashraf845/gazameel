/**
 * رفع مباشر للمتصفح → Supabase Storage (يتجاوز حد Vercel 4.5MB على الـ API).
 * السيرفر يصدر رابط توقيع؛ العميل يرفع الملف؛ ثم السيرفر يسجّل الصف في DB.
 */
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { MAX_FILE_BYTES, MAX_PENDING_PER_USER } from "@/shared/lib/constants";
import { isAllowedResourceType } from "@/shared/lib/courses";
import { resolveContributorDisplayName } from "@/shared/lib/contributor-name";
import { extForMime, isAllowedMime } from "@/features/upload/files";
import { notifyAdminNewSubmission } from "@/features/automations/telegram";
import { runAfterResponse } from "@/shared/lib/background";
import { revalidatePublicContent } from "@/shared/lib/revalidate";
import { randomUUID } from "crypto";

export type PrepareUploadInput = {
  courseCode: string;
  title: string;
  resourceType: string;
  mimeType: string;
  fileSize: number;
  /** pending للطالب | approved للأدمن */
  folder: "pending" | "approved";
  userId: string;
  contributor?: string;
  externalUrl?: string;
};

export async function prepareDirectUpload(
  input: PrepareUploadInput
): Promise<
  | {
      ok: true;
      path: string;
      token: string;
      signedUrl: string;
      courseId: string;
    }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  const title = input.title.trim();
  const courseCode = input.courseCode.trim();
  if (!title || !courseCode) {
    return { ok: false, error: "العنوان والمادة مطلوبان", status: 400 };
  }
  if (!isAllowedResourceType(input.resourceType)) {
    return { ok: false, error: "نوع الملف غير مسموح", status: 400 };
  }
  if (input.resourceType === "video") {
    return {
      ok: false,
      error: "الفيديو يُحفظ برابط خارجي — لا يحتاج رفع ملف",
      status: 400,
    };
  }
  if (!isAllowedMime(input.mimeType)) {
    return {
      ok: false,
      error: "المسموح: PDF أو صورة (jpeg/png/webp) فقط.",
      status: 400,
    };
  }
  if (!input.fileSize || input.fileSize <= 0) {
    return { ok: false, error: "اختر ملفًا.", status: 400 };
  }
  if (input.fileSize > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `الحد الأقصى ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} ميجابايت.`,
      status: 400,
    };
  }

  if (input.folder === "pending") {
    const { count } = await admin
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", input.userId)
      .eq("status", "pending");
    if ((count ?? 0) >= MAX_PENDING_PER_USER) {
      return {
        ok: false,
        error: `لديك ${MAX_PENDING_PER_USER} ملفات قيد المراجعة. انتظر القرار أولًا.`,
        status: 429,
      };
    }
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", courseCode)
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const ext = extForMime(input.mimeType);
  const path =
    input.folder === "pending"
      ? `pending/${input.userId}/${randomUUID()}.${ext}`
      : `approved/${course.id}/${randomUUID()}.${ext}`;

  const { data, error } = await admin.storage
    .from("resources")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "تعذّر تجهيز رابط الرفع",
      status: 500,
    };
  }

  return {
    ok: true,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    courseId: course.id,
  };
}

export async function completeStudentUpload(input: {
  userId: string;
  profileName: string | null;
  path: string;
  courseCode: string;
  title: string;
  resourceType: string;
  mimeType: string;
  fileSize: number;
  contributor?: string;
}): Promise<
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  if (!input.path.startsWith(`pending/${input.userId}/`)) {
    return { ok: false, error: "مسار ملف غير صالح", status: 400 };
  }

  // تأكد أن الملف وصل للتخزين
  const { data: exists, error: headErr } = await admin.storage
    .from("resources")
    .createSignedUrl(input.path, 60);
  if (headErr || !exists?.signedUrl) {
    return {
      ok: false,
      error: "لم يُعثر على الملف بعد الرفع — أعد المحاولة",
      status: 400,
    };
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", input.courseCode.trim())
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const { data: resource, error: insErr } = await admin
    .from("resources")
    .insert({
      course_id: course.id,
      title: input.title.trim(),
      resource_type: input.resourceType,
      storage_path: input.path,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      status: "pending",
      contributor_display_name: resolveContributorDisplayName(
        input.contributor || input.profileName
      ),
      uploaded_by: input.userId,
    })
    .select("id")
    .single();

  if (insErr || !resource) {
    await admin.storage.from("resources").remove([input.path]);
    return {
      ok: false,
      error: insErr?.message || "فشل حفظ بيانات الملف",
      status: 500,
    };
  }

  runAfterResponse(() => notifyAdminNewSubmission(resource.id));

  return {
    ok: true,
    id: resource.id,
    message:
      "شكرًا لمساهمتك! ملفك قيد المراجعة من قِبل الأدمن وسينشر فور اعتماده.",
  };
}

export async function completeAdminUpload(input: {
  adminId: string;
  profileName: string | null;
  path: string;
  courseCode: string;
  title: string;
  resourceType: string;
  mimeType: string;
  fileSize: number;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };

  if (!input.path.startsWith("approved/")) {
    return { ok: false, error: "مسار ملف غير صالح", status: 400 };
  }

  const { data: exists, error: headErr } = await admin.storage
    .from("resources")
    .createSignedUrl(input.path, 60);
  if (headErr || !exists?.signedUrl) {
    return {
      ok: false,
      error: "لم يُعثر على الملف بعد الرفع — أعد المحاولة",
      status: 400,
    };
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("code", input.courseCode.trim())
    .maybeSingle();
  if (!course) return { ok: false, error: "المادة غير موجودة", status: 400 };

  const publisher = resolveContributorDisplayName(
    input.profileName,
    "فريق Gazameel"
  );

  const { data: resource, error } = await admin
    .from("resources")
    .insert({
      course_id: course.id,
      title: input.title.trim(),
      resource_type: input.resourceType,
      storage_path: input.path,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      status: "approved",
      contributor_display_name: publisher,
      uploaded_by: input.adminId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.adminId,
    })
    .select("id")
    .single();

  if (error || !resource) {
    await admin.storage.from("resources").remove([input.path]);
    return { ok: false, error: error?.message || "فشل الحفظ", status: 500 };
  }

  await admin.from("updates_feed").insert({
    message: `تم إضافة «${input.title.trim()}» بواسطة ${publisher}`,
    resource_id: resource.id,
  });

  runAfterResponse(async () => {
    revalidatePublicContent(input.courseCode.trim());
  });

  return { ok: true, id: resource.id };
}
