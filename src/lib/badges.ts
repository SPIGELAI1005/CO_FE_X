/**
 * Badge definitions, progress helpers, and visual tokens.
 * Criteria types mirror `evaluate_user_badges` in Postgres.
 */

import type { LucideIcon } from "lucide-react";
import {
  Award,
  CloudRain,
  Coffee,
  Compass,
  Crown,
  Flame,
  Gem,
  Gift,
  Globe2,
  Leaf,
  MapPin,
  Moon,
  Share2,
  Sparkles,
  Sun,
  Sunrise,
  Trophy,
  Users,
} from "lucide-react";

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface BadgeCriteria {
  type: string;
  threshold?: number;
  value?: string;
  countries?: string[];
  max_shop_check_ins?: number;
  hour?: number;
}

export interface ExplorerBadgeStats {
  campaigns_completed: number;
  reward_type_counts: Record<string, number>;
  unique_local_shops: number;
  low_discovery_visits: number;
  social_posts: number;
  gifts_sent: number;
  sunday_campaigns: number;
  rainy_campaigns: number;
  allach_campaigns: number;
  munich_districts: number;
  early_bird_campaigns: number;
  night_owl_campaigns: number;
  total_check_ins: number;
  unique_shops: number;
  tag_counts: Record<string, number>;
  city_counts: Record<string, number>;
  countries_visited: string[];
}

export const BADGE_RARITY_STYLES: Record<
  BadgeRarity,
  { labelKey: string; ring: string; chip: string; glow: string }
> = {
  common: {
    labelKey: "badges.rarity.common",
    ring: "ring-slate-300/60",
    chip: "bg-slate-100 text-slate-700",
    glow: "from-slate-300 to-slate-500",
  },
  uncommon: {
    labelKey: "badges.rarity.uncommon",
    ring: "ring-emerald-300/70",
    chip: "bg-emerald-100 text-emerald-800",
    glow: "from-emerald-400 to-green-600",
  },
  rare: {
    labelKey: "badges.rarity.rare",
    ring: "ring-sky-300/70",
    chip: "bg-sky-100 text-sky-800",
    glow: "from-sky-400 to-blue-600",
  },
  epic: {
    labelKey: "badges.rarity.epic",
    ring: "ring-violet-300/80",
    chip: "bg-violet-100 text-violet-800",
    glow: "from-violet-400 to-fuchsia-600",
  },
  legendary: {
    labelKey: "badges.rarity.legendary",
    ring: "ring-amber-300/90",
    chip: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900",
    glow: "from-amber-300 via-orange-400 to-rose-500",
  },
};

export const BADGE_ICON_MAP: Record<string, { Icon: LucideIcon; from: string; to: string }> = {
  "first-sip": { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  "espresso-hunter": { Icon: Flame, from: "from-orange-500", to: "to-red-700" },
  "matcha-master": { Icon: Leaf, from: "from-emerald-400", to: "to-green-700" },
  "ice-cream-explorer": { Icon: Sparkles, from: "from-pink-400", to: "to-rose-500" },
  "local-hero": { Icon: Users, from: "from-sky-400", to: "to-blue-700" },
  "hidden-gem-finder": { Icon: Gem, from: "from-violet-400", to: "to-purple-700" },
  "sunday-explorer": { Icon: Sun, from: "from-yellow-300", to: "to-amber-500" },
  "rainy-day-coffee": { Icon: CloudRain, from: "from-slate-400", to: "to-blue-600" },
  "allach-explorer": { Icon: MapPin, from: "from-lime-400", to: "to-green-700" },
  "munich-coffee-trail": { Icon: Compass, from: "from-blue-400", to: "to-indigo-700" },
  "early-bird": { Icon: Sunrise, from: "from-amber-300", to: "to-orange-500" },
  "night-owl": { Icon: Moon, from: "from-indigo-500", to: "to-violet-800" },
  "social-spark": { Icon: Share2, from: "from-fuchsia-400", to: "to-pink-600" },
  "eeffoc-friend": { Icon: Gift, from: "from-cyan-400", to: "to-teal-600" },
  "eeffoc-legend": { Icon: Trophy, from: "from-yellow-300", to: "to-amber-700" },
  "coffee-curious": { Icon: Sparkles, from: "from-pink-400", to: "to-rose-600" },
  "cafe-connoisseur": { Icon: Crown, from: "from-yellow-300", to: "to-amber-600" },
  "espresso-explorer": { Icon: Flame, from: "from-orange-500", to: "to-red-700" },
  "matcha-hunter": { Icon: Leaf, from: "from-emerald-400", to: "to-green-700" },
  "coffee-nomad": { Icon: Compass, from: "from-sky-400", to: "to-indigo-700" },
  "munich-explorer": { Icon: MapPin, from: "from-blue-400", to: "to-blue-800" },
  "berlin-explorer": { Icon: MapPin, from: "from-zinc-400", to: "to-zinc-800" },
  "european-coffee-legend": { Icon: Globe2, from: "from-violet-400", to: "to-purple-800" },
};

export function badgeIconMeta(slug: string) {
  return BADGE_ICON_MAP[slug] ?? { Icon: Award, from: "from-amber-400", to: "to-orange-600" };
}

export function normalizeBadgeRarity(rarity: string | null | undefined): BadgeRarity {
  if (rarity === "uncommon" || rarity === "rare" || rarity === "epic" || rarity === "legendary") {
    return rarity;
  }
  return "common";
}

export function badgeProgress(
  criteria: BadgeCriteria | null | undefined,
  stats: ExplorerBadgeStats,
): { current: number; threshold: number; pct: number } {
  const c = criteria ?? { type: "check_ins", threshold: 1 };
  const threshold = Math.max(1, Number(c.threshold ?? 1));
  let current = 0;

  switch (c.type) {
    case "check_ins":
      current = stats.total_check_ins;
      break;
    case "unique_shops":
      current = stats.unique_shops;
      break;
    case "tag":
      current = stats.tag_counts[String(c.value ?? "").toLowerCase()] ?? 0;
      break;
    case "city":
      current = stats.city_counts[String(c.value ?? "").toLowerCase()] ?? 0;
      break;
    case "beverage":
      current = stats.tag_counts[String(c.value ?? "").toLowerCase()] ?? 0;
      break;
    case "region_countries": {
      const set = new Set((c.countries ?? []).map((s) => s.toLowerCase()));
      current = stats.countries_visited.filter((x) => set.has(x.toLowerCase())).length;
      break;
    }
    case "campaigns_completed":
      current = stats.campaigns_completed;
      break;
    case "reward_type_redeemed":
      current = stats.reward_type_counts[String(c.value ?? "").toLowerCase()] ?? 0;
      break;
    case "unique_local_shops":
      current = stats.unique_local_shops;
      break;
    case "low_discovery_shops":
      current = stats.low_discovery_visits;
      break;
    case "social_posts":
      current = stats.social_posts;
      break;
    case "gifts_sent":
      current = stats.gifts_sent;
      break;
    case "campaign_sunday":
      current = stats.sunday_campaigns;
      break;
    case "campaign_rainy":
      current = stats.rainy_campaigns;
      break;
    case "neighborhood_completed":
      current = stats.allach_campaigns;
      break;
    case "munich_districts":
      current = stats.munich_districts;
      break;
    case "campaign_before_hour":
      current = stats.early_bird_campaigns;
      break;
    case "campaign_after_hour":
      current = stats.night_owl_campaigns;
      break;
    default:
      current = 0;
  }

  const capped = Math.min(current, threshold);
  return {
    current: capped,
    threshold,
    pct: Math.min(100, Math.round((current / threshold) * 100)),
  };
}

export const EMPTY_BADGE_STATS: ExplorerBadgeStats = {
  campaigns_completed: 0,
  reward_type_counts: {},
  unique_local_shops: 0,
  low_discovery_visits: 0,
  social_posts: 0,
  gifts_sent: 0,
  sunday_campaigns: 0,
  rainy_campaigns: 0,
  allach_campaigns: 0,
  munich_districts: 0,
  early_bird_campaigns: 0,
  night_owl_campaigns: 0,
  total_check_ins: 0,
  unique_shops: 0,
  tag_counts: {},
  city_counts: {},
  countries_visited: [],
};
