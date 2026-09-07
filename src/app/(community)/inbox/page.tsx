import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/auth";
import { InboxPanel } from "@/features/community/components/InboxPanel";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/inbox");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">
        صندوق الرسائل
      </h1>
      <p className="mb-6 mt-2 text-sm text-[var(--text-secondary)]">
        إعلانات وتنبيهات إدارة Gazameel.
      </p>
      <InboxPanel />
    </div>
  );
}
