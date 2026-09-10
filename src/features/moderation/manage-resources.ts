/**
 * حذف واستبدال ملفات بعد الرفع/النشر.
 * الصلاحية: صاحب الملف (uploaded_by) أو أدمن — عبر service_role فقط.
 */
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";
import { MAX_FILE_BYTES } from "@/shared/lib/constants";
import { revalidatePublicContent } from "@/shared/lib/revalidate";
import { extForMime, isAllowedMime } from "@/features/upload/files";
import { notifyAdminNewSubmission } from "@/features/automations/telegram";
import { runAfterResponse } from "@/shared/lib/background";
import { randomUUID } from "crypto";

type Actor = { id: string; isAdmin: boolean };

async function loadResource(id: string) {
  const admin = createAdminClient();
  if (!admin) return { admin: null, resource: null, error: SUPABASE_UNCONFIGURED_AR };

  const { data: resource, error } = await admin
    .from("resources")
    .select("*, courses(code, name_ar)")
    .eq("id", id)
    .maybeSingle();

  if (error || !resource) {
    return { admin, resource: null, error: "الملف غير موجود" };
  }
  return { admin, resource, error: null as string | null };
}

function canManage(
  resource: { uploaded_by: string | null },
  actor: Actor
): boolean {
  return actor.isAdmin || resource.uploaded_by === actor.id;
}

/** حذف نهائي: صف DB + ملف التخزين */
export async function deleteManagedResource(resourceId: string, actor: Actor) {
  const { admin, resource, error } = await loadResource(resourceId);
  if (!admin) return { ok: false as const, error: error || SUPABASE_UNCONFIGURED_AR, status: 503 };
  if (!resource) return { ok: false as const, error: error || "الملف غير موجود", status: 404 };
  if (!canManage(resource, actor)) {
    return { ok: false as const, error: "غير مصرّح بحذف هذا الملف", status: 403 };
  }

  const courseCode = (resource.courses as { code?: string } | null)?.code;
  const wasApproved = resource.status === "approved";
  const path = resource.storage_path as string | null;

  const { error: delErr } = await admin.from("resources").delete().eq("id", resourceId);
  if (delErr) {
    return { ok: false as const, error: delErr.message, status: 500 };
  }

  if (path) {
    await admin.storage.from("resources").remove([path]);
  }

  if (wasApproved) {
    revalidatePublicContent(courseCode);
  }

  return { ok: true as const };
}

/** تجهيز رابط رفع لاستبدال ملف موجود */
export async function prepareReplaceResource(
  resourceId: string,
  actor: Actor,
  input: { mimeType: string; fileSize: number }
) {
  const { admin, resource, error } = await loadResource(resourceId);
  if (!admin) return { ok: false as const, error: error || SUPABASE_UNCONFIGURED_AR, status: 503 };
  if (!resource) return { ok: false as const, error: error || "الملف غير موجود", status: 404 };
  if (!canManage(resource, actor)) {
    return { ok: false as const, error: "غير مصرّح باستبدال هذا الملف", status: 403 };
  }
  if (resource.resource_type === "video" && !resource.storage_path) {
    return {
      ok: false as const,
      error: "هذا فيديو برابط — حدّث الرابط بدل رفع ملف",
      status: 400,
    };
  }
  if (!isAllowedMime(input.mimeType)) {
    return {
      ok: false as const,
      error: "المسموح: PDF أو صورة (jpeg/png/webp) فقط.",
      status: 400,
    };
  }
  if (!input.fileSize || input.fileSize <= 0) {
    return { ok: false as const, error: "اختر ملفًا.", status: 400 };
  }
  if (input.fileSize > MAX_FILE_BYTES) {
    return {
      ok: false as const,
      error: `الحد الأقصى ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} ميجابايت.`,
      status: 400,
    };
  }

  // أدمن يستبدل معتمدًا → يبقى تحت approved؛ غير الأدمن → pending حتى المراجعة
  const keepApproved = actor.isAdmin && resource.status === "approved";
  const ext = extForMime(input.mimeType);
  const path = keepApproved
    ? `approved/${resource.course_id}/${resourceId}-${randomUUID()}.${ext}`
    : `pending/${actor.id}/${randomUUID()}.${ext}`;

  const { data, error: signErr } = await admin.storage
    .from("resources")
    .createSignedUploadUrl(path);

  if (signErr || !data) {
    return {
      ok: false as const,
      error: signErr?.message || "تعذّر تجهيز رابط الرفع",
      status: 500,
    };
  }

  return {
    ok: true as const,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    keepApproved,
  };
}

/** إتمام الاستبدال بعد رفع الملف للتخزين */
export async function completeReplaceResource(
  resourceId: string,
  actor: Actor,
  input: {
    path: string;
    mimeType: string;
    fileSize: number;
    title?: string;
  }
) {
  const { admin, resource, error } = await loadResource(resourceId);
  if (!admin) return { ok: false as const, error: error || SUPABASE_UNCONFIGURED_AR, status: 503 };
  if (!resource) return { ok: false as const, error: error || "الملف غير موجود", status: 404 };
  if (!canManage(resource, actor)) {
    return { ok: false as const, error: "غير مصرّح باستبدال هذا الملف", status: 403 };
  }

  const keepApproved = actor.isAdmin && resource.status === "approved";
  const expectedPrefix = keepApproved
    ? `approved/${resource.course_id}/`
    : `pending/${actor.id}/`;
  if (!input.path.startsWith(expectedPrefix)) {
    return { ok: false as const, error: "مسار ملف غير صالح", status: 400 };
  }

  const { data: exists, error: headErr } = await admin.storage
    .from("resources")
    .createSignedUrl(input.path, 60);
  if (headErr || !exists?.signedUrl) {
    return {
      ok: false as const,
      error: "لم يُعثر على الملف بعد الرفع — أعد المحاولة",
      status: 400,
    };
  }

  const oldPath = resource.storage_path as string | null;
  const nextStatus = keepApproved ? "approved" : "pending";
  const title = input.title?.trim();
  const courseCode = (resource.courses as { code?: string } | null)?.code;

  const { error: updErr } = await admin
    .from("resources")
    .update({
      storage_path: input.path,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      external_url: null,
      status: nextStatus,
      rejection_reason: null,
      ...(title ? { title } : {}),
      ...(keepApproved
        ? {
            reviewed_at: new Date().toISOString(),
            reviewed_by: actor.id,
          }
        : {
            reviewed_at: null,
            reviewed_by: null,
          }),
    })
    .eq("id", resourceId);

  if (updErr) {
    await admin.storage.from("resources").remove([input.path]);
    return { ok: false as const, error: updErr.message, status: 500 };
  }

  if (oldPath && oldPath !== input.path) {
    await admin.storage.from("resources").remove([oldPath]);
  }

  if (keepApproved) {
    revalidatePublicContent(courseCode);
  } else if (resource.status === "approved") {
    // سُحب من المكتبة حتى إعادة المراجعة
    revalidatePublicContent(courseCode);
    runAfterResponse(() => notifyAdminNewSubmission(resourceId));
  } else if (nextStatus === "pending") {
    runAfterResponse(() => notifyAdminNewSubmission(resourceId));
  }

  return {
    ok: true as const,
    status: nextStatus,
    message: keepApproved
      ? "تم استبدال الملف في المكتبة"
      : "تم استبدال الملف وهو قيد المراجعة مجددًا",
  };
}

/** تحديث رابط فيديو منشور */
export async function replaceVideoUrl(
  resourceId: string,
  actor: Actor,
  externalUrl: string
) {
  const { admin, resource, error } = await loadResource(resourceId);
  if (!admin) return { ok: false as const, error: error || SUPABASE_UNCONFIGURED_AR, status: 503 };
  if (!resource) return { ok: false as const, error: error || "الملف غير موجود", status: 404 };
  if (!canManage(resource, actor)) {
    return { ok: false as const, error: "غير مصرّح", status: 403 };
  }
  if (resource.resource_type !== "video") {
    return { ok: false as const, error: "هذا ليس فيديو برابط", status: 400 };
  }
  const url = externalUrl.trim();
  if (!url) {
    return { ok: false as const, error: "رابط الفيديو مطلوب", status: 400 };
  }

  const keepApproved = actor.isAdmin && resource.status === "approved";
  const courseCode = (resource.courses as { code?: string } | null)?.code;

  const { error: updErr } = await admin
    .from("resources")
    .update({
      external_url: url,
      status: keepApproved ? "approved" : "pending",
      rejection_reason: null,
      ...(keepApproved
        ? { reviewed_at: new Date().toISOString(), reviewed_by: actor.id }
        : { reviewed_at: null, reviewed_by: null }),
    })
    .eq("id", resourceId);

  if (updErr) return { ok: false as const, error: updErr.message, status: 500 };

  if (keepApproved || resource.status === "approved") {
    revalidatePublicContent(courseCode);
  }
  if (!keepApproved) {
    runAfterResponse(() => notifyAdminNewSubmission(resourceId));
  }

  return {
    ok: true as const,
    message: keepApproved
      ? "تم تحديث رابط الفيديو"
      : "تم تحديث الرابط وهو قيد المراجعة مجددًا",
  };
}

export type ManagedResourceRow = {
  id: string;
  title: string;
  status: string;
  resource_type: string;
  created_at: string;
  contributor_display_name: string | null;
  external_url: string | null;
  storage_path: string | null;
  courses: { code: string; name_ar: string } | null;
};

/** قائمة الملفات المعتمدة للأدمن (إدارة/حذف/استبدال) */
export async function listApprovedResources(opts?: {
  courseCode?: string;
  limit?: number;
}): Promise<
  | { ok: true; items: ManagedResourceRow[] }
  | { ok: false; error: string; status: number }
> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: SUPABASE_UNCONFIGURED_AR, status: 503 };
  }

  let q = admin
    .from("resources")
    .select(
      "id, title, status, resource_type, created_at, contributor_display_name, external_url, storage_path, courses(code, name_ar)"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 80);

  if (opts?.courseCode) {
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", opts.courseCode)
      .maybeSingle();
    if (!course) return { ok: true, items: [] };
    q = q.eq("course_id", course.id);
  }

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message, status: 500 };

  return {
    ok: true,
    items: (data || []) as unknown as ManagedResourceRow[],
  };
}
