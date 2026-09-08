"use client";

import { useLinkStatus } from "next/link";

/** نقطة متحركة داخل الرابط المضغوط أثناء الانتقال */
export function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`nav-link-pulse ${pending ? "is-pending" : ""}`}
    />
  );
}
