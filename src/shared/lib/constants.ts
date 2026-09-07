/**
 * ثوابت المنصة — حدود الرفع وأنواع الملفات المسموحة
 * (من خطة الأمان: 15MB، PDF + صور، حد 3 ملفات pending)
 */

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 ميجابايت
export const MAX_PENDING_PER_USER = 3;

/** أنواع MIME المسموحة فقط — نتحقق منها على السيرفر لاحقًا */
export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DISCLAIMER_AR =
  "هذا الموقع منصة طلابية غير رسمية، تم تطويرها بمبادرة فردية لخدمة الطلاب وتبادل المصادر الأكاديمية، ولا تتبع تقنيًا أو إداريًا لإدارة الجامعة.";

export const TAGLINE_AR = "كل ما يحتاجه الطالب، في مكان واحد.";
export const TAGLINE_EN = "Everything a student needs, in one place.";

export const BRAND = "Gazameel";
