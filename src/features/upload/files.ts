import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/shared/lib/constants";

export function validateUploadFile(file: File | null): string | null {
  if (!file || file.size === 0) return "اختر ملفًا.";
  if (file.size > MAX_FILE_BYTES) {
    return `الحد الأقصى ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} ميجابايت.`;
  }
  const mime = mimeFromFile(file);
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    return "المسموح: PDF أو صورة (jpeg/png/webp) فقط.";
  }
  return null;
}

/** بعض المتصفحات (خصوصًا Safari) تترك file.type فارغًا — نستنتج من الامتداد */
export function mimeFromFile(file: File): string {
  if (
    file.type &&
    ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])
  ) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return file.type || "";
}

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number]);
}

/** تحقق بسيط من البايتات الأولى (magic bytes) */
export async function sniffMime(
  buffer: ArrayBuffer,
  claimed: string
): Promise<boolean> {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const isPdf =
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (claimed === "application/pdf") return isPdf;
  if (claimed === "image/jpeg") return isJpeg;
  if (claimed === "image/png") return isPng;
  if (claimed === "image/webp") return isWebp;
  return false;
}

export function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

/** رفع الملف من المتصفح إلى رابط التوقيع (Supabase Storage) */
export async function putFileToSignedUrl(
  signedUrl: string,
  file: File,
  mimeType: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error:
          text.slice(0, 160) ||
          `فشل رفع الملف إلى التخزين (رمز ${res.status})`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "انقطع الاتصال أثناء رفع الملف — أعد المحاولة" };
  }
}

/** قراءة رسالة خطأ من استجابة API (حتى لو HTML/413 من Vercel) */
export async function readApiError(
  res: Response,
  fallback = "فشل الرفع"
): Promise<string> {
  if (res.status === 413) {
    return "الملف أكبر من حد الخادم المؤقت. حدّث الصفحة وحاول مجددًا.";
  }
  const text = await res.text().catch(() => "");
  if (!text) return `${fallback} (رمز ${res.status})`;
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.error || data.message || `${fallback} (رمز ${res.status})`;
  } catch {
    if (/payload|too large|entity too large/i.test(text)) {
      return "الملف كبير جدًا. حدّث الصفحة وحاول مجددًا.";
    }
    return text.slice(0, 180) || `${fallback} (رمز ${res.status})`;
  }
}
