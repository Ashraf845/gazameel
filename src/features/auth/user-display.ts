/** اسم العرض + صورة Google من جلسة Supabase */
type AuthUserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type ProfileLike = {
  full_name?: string | null;
} | null;

export function getAvatarUrl(user: AuthUserLike | null | undefined): string | null {
  if (!user?.user_metadata) return null;
  const m = user.user_metadata;
  const url = m.avatar_url ?? m.picture;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

export function getDisplayName(
  user: AuthUserLike | null | undefined,
  profile?: ProfileLike
): string {
  const fromProfile = profile?.full_name?.trim();
  if (fromProfile) return fromProfile;

  const m = user?.user_metadata;
  if (m) {
    const full = m.full_name ?? m.name;
    if (typeof full === "string" && full.trim()) return full.trim();
  }

  const email = user?.email?.split("@")[0];
  if (email) return email;

  return "طالب";
}
