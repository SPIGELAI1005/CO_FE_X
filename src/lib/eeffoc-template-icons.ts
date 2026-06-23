import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Camera,
  CloudRain,
  Coffee,
  Gift,
  Heart,
  Home,
  Map,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { EeffocTemplate, EeffocTemplateCategory } from "@/lib/eeffoc-templates";
import { inferRewardType } from "@/lib/map/campaign-markers";
import type { RewardIconMeta } from "@/lib/reward-icons";

export type IconTileMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

const CATEGORY_ICON_META: Record<EeffocTemplateCategory, IconTileMeta> = {
  classic: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  limited_drop: { Icon: Zap, from: "from-violet-400", to: "to-purple-600" },
  time_window: { Icon: Calendar, from: "from-sky-400", to: "to-blue-600" },
  friend: { Icon: Users, from: "from-cyan-400", to: "to-teal-600" },
  repeat_visitor: { Icon: Heart, from: "from-pink-400", to: "to-rose-500" },
  discovery: { Icon: Map, from: "from-emerald-400", to: "to-green-700" },
  premium: { Icon: Star, from: "from-amber-300", to: "to-amber-600" },
  weather: { Icon: CloudRain, from: "from-slate-400", to: "to-slate-700" },
  weekly_ritual: { Icon: Sun, from: "from-yellow-300", to: "to-orange-500" },
  creator: { Icon: Camera, from: "from-fuchsia-400", to: "to-pink-600" },
  custom: { Icon: Sparkles, from: "from-indigo-400", to: "to-violet-600" },
};

export function resolveEeffocTemplateIcon(
  tpl: EeffocTemplate,
): { rewardType: string } | { meta: IconTileMeta } {
  const rewardType = inferRewardType(null, tpl.reward_description);
  if (rewardType !== "other") return { rewardType };
  return { meta: CATEGORY_ICON_META[tpl.category] };
}

export function resolveWizardSuggestionIcon(
  suggestion: { id?: string; patch: { reward_type?: string } },
): { rewardType: string } | { meta: IconTileMeta } {
  if (suggestion.id === "custom_campaign") {
    return { meta: CATEGORY_ICON_META.custom };
  }
  if (suggestion.patch.reward_type) return { rewardType: suggestion.patch.reward_type };
  return { meta: { Icon: Trophy, from: "from-amber-300", to: "to-amber-600" } };
}
