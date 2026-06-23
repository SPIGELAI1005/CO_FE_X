/** Partner verify deep link for wallet catalog codes. */
export function walletVerifyUrl(redemptionCode: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/partner/verify?code=${encodeURIComponent(redemptionCode)}`;
  }
  return `/partner/verify?code=${encodeURIComponent(redemptionCode)}`;
}

/** Deep link for printed door QR — opens shop page in door-check-in mode. */
export function shopDoorUrl(shopSlug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/coffee/${encodeURIComponent(shopSlug)}?door=1`;
  }
  return `/coffee/${encodeURIComponent(shopSlug)}?door=1`;
}

export type RewardLifecycleStatus = "locked" | "unlocked" | "redeemed" | "expired";

export function resolveRewardDisplayStatus(input: {
  usedAt?: string | null;
  expiresAt?: string | null;
  rewardStatus?: RewardLifecycleStatus | string | null;
}): RewardLifecycleStatus {
  if (input.usedAt || input.rewardStatus === "redeemed") return "redeemed";
  if (input.rewardStatus === "expired") return "expired";
  if (input.expiresAt && new Date(input.expiresAt) < new Date()) return "expired";
  return "unlocked";
}

export function formatRewardExpiry(expiresAt: string | null | undefined, locale?: string): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
