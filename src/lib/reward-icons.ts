import type { LucideIcon } from "lucide-react";
import {
  Citrus,
  Coffee,
  CupSoda,
  Flame,
  Gift,
  IceCreamCone,
  Leaf,
  Milk,
} from "lucide-react";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

/** Shared gradient icon tokens for rewards, beverages, stamps, and map pins. */
export interface RewardIconMeta {
  Icon: LucideIcon;
  from: string;
  to: string;
  color: string;
  ring: string;
}

export const REWARD_ICON_META: Record<CampaignRewardType, RewardIconMeta> = {
  coffee: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600", color: "#3d2417", ring: "#c8a063" },
  espresso: { Icon: Flame, from: "from-orange-500", to: "to-red-700", color: "#2c1810", ring: "#e8b86d" },
  cappuccino: { Icon: Milk, from: "from-amber-500", to: "to-orange-700", color: "#5c4033", ring: "#f5deb3" },
  matcha: { Icon: Leaf, from: "from-emerald-400", to: "to-green-700", color: "#2d5016", ring: "#7cb342" },
  ice_cream: { Icon: IceCreamCone, from: "from-pink-400", to: "to-rose-500", color: "#c2185b", ring: "#f8bbd0" },
  juice: { Icon: Citrus, from: "from-lime-400", to: "to-green-600", color: "#f57c00", ring: "#ffe082" },
  cola: { Icon: CupSoda, from: "from-red-400", to: "to-rose-700", color: "#b71c1c", ring: "#ef9a9a" },
  other: { Icon: Gift, from: "from-violet-400", to: "to-purple-600", color: "#455a64", ring: "#80cbc4" },
};

/** Drink-tracker categories beyond campaign reward types. */
export const DRINK_TRACKER_ICON_META: Record<string, RewardIconMeta> = {
  latte: { Icon: Milk, from: "from-sky-300", to: "to-blue-500", color: "#5c7a9a", ring: "#b3d4fc" },
  americano: { Icon: Coffee, from: "from-stone-500", to: "to-stone-800", color: "#4a4038", ring: "#d6cfc4" },
  tea: { Icon: Leaf, from: "from-teal-400", to: "to-emerald-700", color: "#2d6a4f", ring: "#95d5b2" },
};

export function resolveRewardIconMeta(id: string): RewardIconMeta {
  if (id in REWARD_ICON_META) return REWARD_ICON_META[id as CampaignRewardType];
  if (id in DRINK_TRACKER_ICON_META) return DRINK_TRACKER_ICON_META[id];
  return REWARD_ICON_META.other;
}

export const CAMPAIGN_REWARD_TYPES = Object.keys(REWARD_ICON_META) as CampaignRewardType[];
