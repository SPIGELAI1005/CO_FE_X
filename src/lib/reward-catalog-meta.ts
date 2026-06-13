import type { LucideIcon } from "lucide-react";
import { Coffee, Crown, CupSoda, Gift, Sparkles } from "lucide-react";

import type { CatalogItem } from "@/lib/queries/wallet";

export type RewardCatalogAccent = "standard" | "premium" | "default";

export interface RewardCatalogMeta {
  Icon: LucideIcon;
  accent: RewardCatalogAccent;
}

const BY_NAME: Record<string, RewardCatalogMeta> = {
  "free espresso": { Icon: Coffee, accent: "standard" },
  "free cappuccino": { Icon: CupSoda, accent: "standard" },
  "premium reward": { Icon: Crown, accent: "premium" },
};

export function getRewardCatalogMeta(item: Pick<CatalogItem, "name" | "tier">): RewardCatalogMeta {
  const byName = BY_NAME[item.name.trim().toLowerCase()];
  if (byName) return byName;
  if (item.tier === "premium") return { Icon: Sparkles, accent: "premium" };
  return { Icon: Gift, accent: "default" };
}

export function rewardCatalogIconBoxClass(accent: RewardCatalogAccent) {
  if (accent === "premium") {
    return "bg-gradient-to-br from-[color:var(--cofex-accent-gold)]/25 to-[color:var(--cofex-pastel-blue)] ring-1 ring-[color:var(--cofex-accent-gold)]/35";
  }
  return "bg-[color:var(--cofex-pastel-blue)]";
}

export function rewardCatalogIconClass(accent: RewardCatalogAccent) {
  if (accent === "premium") return "text-[color:var(--cofex-coffee-deep)]";
  return "text-[color:var(--cofex-cyan)]";
}
