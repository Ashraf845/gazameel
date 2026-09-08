"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeClientAuth } from "@/features/auth/client-session";

/** يظهر زر الدخول دون انتظار السيرفر — يختفي إن وُجدت جلسة */
export function HeroLoginLink() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    return subscribeClientAuth(({ user }) => {
      setShow(!user);
    });
  }, []);

  if (!show) return null;

  return (
    <Link href="/login" className="btn-ghost">
      دخول Google
    </Link>
  );
}
