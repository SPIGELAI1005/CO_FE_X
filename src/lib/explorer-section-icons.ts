import type { LucideIcon } from "lucide-react";
import {
  Award,
  Camera,
  Coffee,
  Crown,
  Flame,
  Footprints,
  Gift,
  Globe2,
  GraduationCap,
  Heart,
  History,
  Laptop,
  MapPin,
  Megaphone,
  MessageSquareText,
  Share2,
  Sofa,
  Sparkles,
  Stamp,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  List,
} from "lucide-react";
import type { MoodId } from "@/lib/mood-discovery";
import type { LeaderboardMetric } from "@/lib/queries/leaderboard";
import type { RewardIconMeta } from "@/lib/reward-icons";

export type IconTileMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

export const RADAR_SECTION_ICONS = {
  freeCoffee: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" },
  matcha: { Icon: Flame, from: "from-orange-400", to: "to-red-500" },
  campaigns: { Icon: Megaphone, from: "from-fuchsia-400", to: "to-pink-600" },
  challenges: { Icon: Sparkles, from: "from-cyan-400", to: "to-teal-600" },
  leaderboard: { Icon: Trophy, from: "from-amber-300", to: "to-amber-600" },
  moments: { Icon: Sparkles, from: "from-violet-400", to: "to-purple-600" },
} as const satisfies Record<string, IconTileMeta>;

export const RADAR_STAT_ICONS: IconTileMeta[] = [
  { Icon: Zap, from: "from-amber-400", to: "to-orange-500" },
  { Icon: Coffee, from: "from-rose-400", to: "to-pink-500" },
  { Icon: MapPin, from: "from-emerald-400", to: "to-teal-500" },
  { Icon: Sparkles, from: "from-violet-400", to: "to-fuchsia-500" },
];

export const PASSPORT_SECTION_ICONS = {
  stamps: { Icon: Stamp, from: "from-sky-400", to: "to-blue-600" },
  beverages: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  achievements: { Icon: Award, from: "from-amber-300", to: "to-amber-600" },
  cities: { Icon: MapPin, from: "from-emerald-400", to: "to-green-700" },
  world: { Icon: Globe2, from: "from-cyan-400", to: "to-teal-600" },
  emptyStamps: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" },
} as const satisfies Record<string, IconTileMeta>;

export const PROFILE_SECTION_ICONS = {
  crew: { Icon: Users, from: "from-emerald-400", to: "to-green-700" },
  partner: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  push: { Icon: Sparkles, from: "from-sky-400", to: "to-blue-600" },
} as const satisfies Record<string, IconTileMeta>;

export const LEADERBOARD_METRIC_ICONS: Record<LeaderboardMetric, IconTileMeta> = {
  points: { Icon: Sparkles, from: "from-violet-400", to: "to-purple-600" },
  cafes: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  reviews: { Icon: MessageSquareText, from: "from-sky-400", to: "to-blue-600" },
  campaigns: { Icon: Megaphone, from: "from-fuchsia-400", to: "to-pink-600" },
  social: { Icon: Share2, from: "from-rose-400", to: "to-rose-600" },
};

export const LEADERBOARD_PODIUM_ICONS: Record<1 | 2 | 3, IconTileMeta> = {
  1: { Icon: Crown, from: "from-amber-300", to: "to-amber-600" },
  2: { Icon: Award, from: "from-slate-400", to: "to-slate-600" },
  3: { Icon: Award, from: "from-orange-400", to: "to-orange-600" },
};

export const EXPLORE_SORT_ICON_META: Record<string, IconTileMeta> = {
  distance: { Icon: MapPin, from: "from-sky-400", to: "to-blue-600" },
  rating: { Icon: Star, from: "from-amber-300", to: "to-amber-600" },
  popularity: { Icon: TrendingUp, from: "from-emerald-400", to: "to-green-700" },
  free: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" },
};

export const MOOD_ICON_META: Record<MoodId, IconTileMeta> = {
  cozy: { Icon: Sofa, from: "from-amber-400", to: "to-orange-600" },
  productive: { Icon: Laptop, from: "from-sky-400", to: "to-blue-600" },
  date: { Icon: Heart, from: "from-rose-400", to: "to-pink-600" },
  hangover: { Icon: Coffee, from: "from-stone-500", to: "to-stone-700" },
};

export const TRAIL_STAT_ICONS = {
  stops: { Icon: MapPin, from: "from-sky-400", to: "to-blue-600" },
  distance: { Icon: Footprints, from: "from-emerald-400", to: "to-green-700" },
  duration: { Icon: History, from: "from-violet-400", to: "to-purple-600" },
  xp: { Icon: Sparkles, from: "from-amber-300", to: "to-orange-500" },
  badge: { Icon: Award, from: "from-amber-300", to: "to-amber-600" },
} as const satisfies Record<string, IconTileMeta>;

export type CampaignTypeIconRef = { rewardType: string } | { meta: IconTileMeta };

const CAMPAIGN_TYPE_ICONS: Record<string, CampaignTypeIconRef> = {
  free_espresso_friday: { rewardType: "espresso" },
  matcha_monday: { rewardType: "matcha" },
  student_week: { meta: { Icon: GraduationCap, from: "from-indigo-400", to: "to-violet-600" } },
  bogo: { meta: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" } },
  free_with_pastry: { meta: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" } },
  social_story: { meta: { Icon: Camera, from: "from-fuchsia-400", to: "to-pink-600" } },
  custom: { meta: { Icon: Sparkles, from: "from-cyan-400", to: "to-teal-600" } },
};

const CAMPAIGN_META_ICONS: Record<string, IconTileMeta> = {
  reward: { Icon: Gift, from: "from-violet-400", to: "to-purple-600" },
  location: { Icon: MapPin, from: "from-sky-400", to: "to-blue-600" },
  calendar: { Icon: History, from: "from-amber-300", to: "to-orange-500" },
  users: { Icon: Users, from: "from-emerald-400", to: "to-green-700" },
};

export function resolveCampaignTypeIcon(type: string): CampaignTypeIconRef {
  return CAMPAIGN_TYPE_ICONS[type] ?? CAMPAIGN_TYPE_ICONS.custom;
}

export function campaignMetaIcon(key: keyof typeof CAMPAIGN_META_ICONS): IconTileMeta {
  return CAMPAIGN_META_ICONS[key];
}

export function challengeAccentToMeta(accent: string, Icon: LucideIcon): IconTileMeta {
  const parts = accent.trim().split(/\s+/);
  const from = parts.find((p) => p.startsWith("from-")) ?? "from-violet-400";
  const to = parts.find((p) => p.startsWith("to-")) ?? "to-purple-600";
  return { Icon, from, to };
}

export const SHOP_CARD_ICONS = {
  freeCoffee: { rewardType: "coffee" as const },
  distance: { Icon: MapPin, from: "from-sky-400", to: "to-blue-600" },
  campaigns: { Icon: Megaphone, from: "from-fuchsia-400", to: "to-pink-600" },
  explorers: { Icon: Users, from: "from-emerald-400", to: "to-green-700" },
};

export const MOMENTS_EMPTY_ICON: IconTileMeta = { Icon: Sparkles, from: "from-violet-400", to: "to-purple-600" };

export type ExploreFilterIconRef = CampaignTypeIconRef;

const EXPLORE_FILTERS_ICON: Record<string, ExploreFilterIconRef> = {
  free: { meta: EXPLORE_SORT_ICON_META.free },
  campaigns: { meta: RADAR_SECTION_ICONS.campaigns },
  Espresso: { rewardType: "espresso" },
  Cappuccino: { rewardType: "cappuccino" },
  Matcha: { rewardType: "matcha" },
  "Specialty Coffee": { meta: { Icon: Sparkles, from: "from-cyan-400", to: "to-teal-600" } },
  Bakery: { meta: { Icon: Coffee, from: "from-amber-300", to: "to-orange-500" } },
  "Student Friendly": { meta: { Icon: GraduationCap, from: "from-indigo-400", to: "to-violet-600" } },
  "Pet Friendly": { meta: { Icon: Heart, from: "from-rose-400", to: "to-pink-600" } },
  "Remote Work Friendly": { meta: { Icon: Laptop, from: "from-sky-400", to: "to-blue-600" } },
  rating: { meta: EXPLORE_SORT_ICON_META.rating },
  filters: { meta: { Icon: Target, from: "from-slate-500", to: "to-slate-700" } },
};

export function resolveExploreFilterIcon(id: string): ExploreFilterIconRef {
  return EXPLORE_FILTERS_ICON[id] ?? { meta: { Icon: Sparkles, from: "from-slate-400", to: "to-slate-600" } };
}

export const EXPLORE_PANEL_ICONS = {
  list: { Icon: List, from: "from-sky-400", to: "to-blue-600" },
  map: { Icon: Globe2, from: "from-cyan-400", to: "to-teal-600" },
} as const satisfies Record<string, IconTileMeta>;
