export type AdminAudience = "all" | "onboarded" | "telegram";

export type AudienceUser = {
  email: string | null;
  onboarding_done: boolean;
  telegram_chat_id: string | null;
};

export function matchesAudience(user: AudienceUser, audience: AdminAudience) {
  if (audience === "onboarded") return !!user.onboarding_done;
  if (audience === "telegram") return !!user.telegram_chat_id;
  return true;
}

export function emailsForAudience(
  users: AudienceUser[],
  audience: AdminAudience
): string[] {
  return users
    .filter((u) => matchesAudience(u, audience) && u.email)
    .map((u) => u.email as string);
}
