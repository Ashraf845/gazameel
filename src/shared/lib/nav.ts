export type NavLink = {
  href: string;
  label: string;
  featured?: boolean;
};

/** الروابط الظاهرة في الشريط العلوي */
export const PRIMARY_NAV: NavLink[] = [
  { href: "/", label: "الرئيسية" },
  { href: "/hub", label: "المكتبة" },
  { href: "/quiz", label: "اختبارات" },
  { href: "/upload", label: "رفع ملف", featured: true },
  { href: "/calendar", label: "التقويم" },
];

/** قائمة «المزيد» — نفس الروابط في التذييل */
export const MORE_NAV: NavLink[] = [
  { href: "/countdown", label: "العد التنازلي" },
  { href: "/polls", label: "استطلاعات" },
  { href: "/progress", label: "تقدمي" },
  { href: "/my-submissions", label: "مساهماتي" },
  { href: "/contributors", label: "مساهمون" },
  { href: "/telegram", label: "تيليجرام" },
  { href: "/about", label: "عن المنصة" },
];
