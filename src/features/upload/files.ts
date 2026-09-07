import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/shared/lib/constants";

export function validateUploadFile(file: File | null): string | null {
  if (!file || file.size === 0) return "اختر ملفًا.";
  if (file.size > MAX_FILE_BYTES) return "الحد الأقصى 15 ميجابايت.";
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return "المسموح: PDF أو صورة (jpeg/png/webp) فقط.";
  }
  return null;
}

/** تحقق بسيط من البايتات الأولى (magic bytes) */
export async function sniffMime(buffer: ArrayBuffer, claimed: string): Promise<boolean> {
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
