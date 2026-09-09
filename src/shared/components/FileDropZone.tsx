"use client";

import { useState } from "react";

/**
 * منطقة اختيار ملف واضحة (أيقونة + نص).
 * الـ input فوق المنطقة شفافًا حتى يعمل الضغط والتحقق على Safari وChrome.
 */
export function FileDropZone({
  name = "file",
  multiple = false,
  accept = ".pdf,image/jpeg,image/png,image/webp",
  required = false,
  label = "اضغط هنا لاختيار الملف",
  hint = "PDF أو صورة — حتى 15 ميجابايت",
}: {
  name?: string;
  multiple?: boolean;
  accept?: string;
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  const [names, setNames] = useState<string[]>([]);

  return (
    <label className="relative flex w-full cursor-pointer flex-col items-center gap-3 rounded-[4px] border-2 border-dashed border-[var(--accent-gold)] bg-[color-mix(in_srgb,var(--accent-gold)_8%,transparent)] px-4 py-8 text-center transition hover:bg-[color-mix(in_srgb,var(--accent-gold)_14%,transparent)]">
      <UploadIcon />
      <span className="text-base font-semibold text-[var(--text-primary)]">
        {label}
      </span>
      <span className="text-xs text-[var(--text-secondary)]">{hint}</span>
      {names.length > 0 ? (
        <span className="max-w-full truncate text-sm text-[var(--accent-gold)]">
          {names.length === 1
            ? names[0]
            : `${names.length} ملفات: ${names[0]}…`}
        </span>
      ) : null}
      <input
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => {
          setNames(Array.from(e.target.files || []).map((f) => f.name));
        }}
      />
    </label>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className="pointer-events-none h-12 w-12 text-[var(--accent-gold)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 34V14" />
      <path d="m16 20 8-8 8 8" />
      <path d="M10 38h28" />
      <rect x="8" y="34" width="32" height="8" rx="2" opacity="0.35" />
    </svg>
  );
}
