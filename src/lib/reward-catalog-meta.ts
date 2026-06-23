import {
  Coffee,
  Crown,
  Gift,
  History,
  Hourglass,
  Megaphone,
  MessageSquareText,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

import type { CatalogItem } from "@/lib/queries/wallet";
import type { RewardIconMeta } from "@/lib/reward-icons";

export type IconTileMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

export type RewardCatalogIconRef = { rewardType: string } | { meta: IconTileMeta };

const BY_NAME: Record<string, RewardCatalogIconRef> = {
  "free espresso": { rewardType: "espresso" },
  "free cappuccino": { rewardType: "cappuccino" },
  "premium reward": { meta: { Icon: Crown, from: "from-amber-300", to: "to-amber-600" } },
};

const PREMIUM_FALLBACK: IconTileMeta = { Icon: Sparkles, from: "from-violet-400", to: "to-purple-600" };
const DEFAULT_FALLBACK: IconTileMeta = { Icon: Gift, from: "from-slate-400", to: "to-slate-600" };

export function getRewardCatalogIcon(item: Pick<CatalogItem, "name" | "tier">): RewardCatalogIconRef {
  const byName = BY_NAME[item.name.trim().toLowerCase()];
  if (byName) return byName;
  if (item.tier === "premium") return { meta: PREMIUM_FALLBACK };
  return { meta: DEFAULT_FALLBACK };
}

/** Ledger / activity source icons, same gradient tile language as passport rewards. */
export const WALLET_SOURCE_ICON_META: Record<string, IconTileMeta> = {
  check_in: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  review: { Icon: MessageSquareText, from: "from-sky-400", to: "to-blue-600" },
  campaign_redemption: { Icon: Megaphone, from: "from-fuchsia-400", to: "to-pink-600" },
  social_post: { Icon: Share2, from: "from-rose-400", to: "to-rose-600" },
  referral_bonus: { Icon: Users, from: "from-emerald-400", to: "to-green-700" },
  referral_reward: { Icon: Users, from: "from-teal-400", to: "to-emerald-700" },
  catalog_redemption: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" },
  challenge_reward: { Icon: Sparkles, from: "from-violet-400", to: "to-indigo-600" },
  time_bonus: { Icon: Sparkles, from: "from-amber-300", to: "to-orange-500" },
  crawl_complete: { Icon: Coffee, from: "from-emerald-400", to: "to-green-700" },
};

export const WALLET_EARN_ICON_META: IconTileMeta[] = [
  { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  { Icon: MessageSquareText, from: "from-sky-400", to: "to-blue-600" },
  { Icon: Share2, from: "from-rose-400", to: "to-rose-600" },
  { Icon: Megaphone, from: "from-fuchsia-400", to: "to-pink-600" },
  { Icon: Users, from: "from-emerald-400", to: "to-green-700" },
  { Icon: Users, from: "from-teal-400", to: "to-cyan-600" },
];

export const WALLET_SECTION_ICONS = {
  expiration: { Icon: Hourglass, from: "from-amber-300", to: "to-orange-500" } satisfies IconTileMeta,
  redeem: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" } satisfies IconTileMeta,
  history: { Icon: History, from: "from-sky-400", to: "to-blue-600" } satisfies IconTileMeta,
  activity: { Icon: Sparkles, from: "from-cyan-400", to: "to-teal-600" } satisfies IconTileMeta,
  gifts: { Icon: Gift, from: "from-rose-400", to: "to-rose-600" } satisfies IconTileMeta,
  refer: { Icon: Users, from: "from-emerald-400", to: "to-green-700" } satisfies IconTileMeta,
} as const;

export function walletSourceIconMeta(source: string): IconTileMeta {
  return WALLET_SOURCE_ICON_META[source] ?? { Icon: Sparkles, from: "from-slate-400", to: "to-slate-600" };
}

/** @deprecated Use getRewardCatalogIcon, kept for any stale imports. */
export function getRewardCatalogMeta(item: Pick<CatalogItem, "name" | "tier">) {
  const icon = getRewardCatalogIcon(item);
  if ("rewardType" in icon) {
    return { rewardType: icon.rewardType };
  }
  return { meta: icon.meta };
}
