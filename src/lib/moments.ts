export type MomentFeedFilter =
  | "trending"
  | "nearby"
  | "new_cafes"
  | "coffee"
  | "matcha"
  | "ice_cream"
  | "friends";

export type MomentSourceType =
  | "social_proof"
  | "user_moment"
  | "campaign_highlight"
  | "badge_unlock"
  | "trail_complete";

export interface MomentFeedItem {
  id: string;
  source_type: MomentSourceType;
  user_id: string;
  explorer_name: string | null;
  explorer_avatar: string | null;
  explorer_handle: string | null;
  coffee_shop_id: string | null;
  shop_name: string | null;
  shop_slug: string | null;
  shop_cover_url: string | null;
  campaign_id: string | null;
  image_path: string | null;
  image_bucket: string | null;
  image_url: string | null;
  drink_type: string | null;
  badge_slug: string | null;
  badge_name: string | null;
  caption: string | null;
  campaign_slogan: string | null;
  city: string | null;
  distance_km: number | null;
  like_count: number;
  save_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  published_at: string;
}

import type { LucideIcon } from "lucide-react";
import { Flame, MapPin, Sparkles, Users } from "lucide-react";

export const MOMENT_FEED_FILTERS: {
  id: MomentFeedFilter;
  labelKey: string;
  rewardType?: string;
  meta?: { Icon: LucideIcon; from: string; to: string };
}[] = [
  { id: "trending", labelKey: "moments.filters.trending", meta: { Icon: Flame, from: "from-orange-400", to: "to-red-500" } },
  { id: "nearby", labelKey: "moments.filters.nearby", meta: { Icon: MapPin, from: "from-sky-400", to: "to-blue-600" } },
  { id: "new_cafes", labelKey: "moments.filters.newCafes", meta: { Icon: Sparkles, from: "from-violet-400", to: "to-purple-600" } },
  { id: "coffee", labelKey: "moments.filters.coffee", rewardType: "coffee" },
  { id: "matcha", labelKey: "moments.filters.matcha", rewardType: "matcha" },
  { id: "ice_cream", labelKey: "moments.filters.iceCream", rewardType: "ice_cream" },
  { id: "friends", labelKey: "moments.filters.friends", meta: { Icon: Users, from: "from-cyan-400", to: "to-teal-600" } },
];

export function momentDrinkType(drinkType: string | null | undefined): string {
  if (!drinkType) return "coffee";
  return drinkType;
}

export function momentAuthorLabel(item: MomentFeedItem): string {
  if (item.source_type === "campaign_highlight" && item.shop_name) return item.shop_name;
  return item.explorer_name ?? item.explorer_handle ?? "Explorer";
}

export function momentSourceLabelKey(source: MomentSourceType): string {
  return `moments.source.${source}`;
}

export function userSharesMoments(prefs?: Record<string, unknown> | null): boolean {
  return prefs?.share_moments_publicly === true;
}
