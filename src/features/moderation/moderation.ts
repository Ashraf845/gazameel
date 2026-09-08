import { createAdminClient } from "@/shared/lib/supabase/admin";
import { revalidatePublicContent } from "@/shared/lib/revalidate";

export type ReviewAction = "approve" | "reject";

/**
 * انتقال ذرّي pending → approved|rejected
 * عند الموافقة: نقل الملف من pending/ إلى approved/ إن أمكن
 * يُستخدم من لوحة الويب وبوت تيليجرام
 */
export async function reviewResource(
  resourceId: string,
  action: ReviewAction,
  opts?: { reason?: string; reviewerId?: string | null }
) {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false as const, error: "قاعدة البيانات غير مُعدّة" };
  }

  const { data: resource, error } = await admin
    .from("resources")
    .select("*, courses(code, name_ar)")
    .eq("id", resourceId)
    .maybeSingle();

  if (error || !resource) {
    return { ok: false as const, error: "الملف غير موجود" };
  }
  if (resource.status !== "pending") {
    return { ok: false as const, error: "تمت مراجعة هذا الملف مسبقًا", resource };
  }

  if (action === "approve") {
    let nextPath = resource.storage_path as string | null;

    // انقل من pending/ → approved/ حتى لا تبقى الملفات المعتمدة تحت مسار المراجعة
    if (resource.storage_path && String(resource.storage_path).startsWith("pending/")) {
      const ext = String(resource.storage_path).split(".").pop() || "bin";
      const dest = `approved/${resource.course_id}/${resourceId}.${ext}`;
      const { error: moveErr } = await admin.storage
        .from("resources")
        .move(resource.storage_path, dest);
      if (!moveErr) {
        nextPath = dest;
      }
      // إن فشل النقل نُبقي المسار القديم ونُكمل الاعتماد
    }

    const { data: updated, error: updErr } = await admin
      .from("resources")
      .update({
        status: "approved",
        storage_path: nextPath,
        reviewed_at: new Date().toISOString(),
        reviewed_by: opts?.reviewerId ?? null,
      })
      .eq("id", resourceId)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    // سباق مزدوج: إن لم يُحدَّث صف → شخص آخر سبقك
    if (updErr) return { ok: false as const, error: updErr.message };
    if (!updated) {
      return { ok: false as const, error: "تمت مراجعة هذا الملف مسبقًا" };
    }

    const who = resource.contributor_display_name || "طالب";
    await admin.from("updates_feed").insert({
      message: `تم إضافة «${resource.title}» بواسطة ${who}`,
      resource_id: resourceId,
    });

    // المحتوى المعتمد تغيّر → فرّغ كاش الصفحات العامة الآن بدل انتظار المهلة
    revalidatePublicContent(
      (resource.courses as { code?: string } | null)?.code
    );

    return {
      ok: true as const,
      resource: { ...resource, status: "approved", storage_path: nextPath },
    };
  }

  // reject — حذف الملف من التخزين
  const { data: rejected, error: rejErr } = await admin
    .from("resources")
    .update({
      status: "rejected",
      rejection_reason: opts?.reason ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts?.reviewerId ?? null,
    })
    .eq("id", resourceId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (rejErr) return { ok: false as const, error: rejErr.message };
  if (!rejected) {
    return { ok: false as const, error: "تمت مراجعة هذا الملف مسبقًا" };
  }

  if (resource.storage_path) {
    await admin.storage.from("resources").remove([resource.storage_path]);
  }

  return { ok: true as const, resource: { ...resource, status: "rejected" } };
}

export async function createSignedUrl(storagePath: string, expiresIn = 600) {
  const admin = createAdminClient();
  if (!admin) throw new Error("قاعدة البيانات غير مُعدّة");
  const { data, error } = await admin.storage
    .from("resources")
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
