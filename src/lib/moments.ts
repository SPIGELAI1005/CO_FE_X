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

export const MOMENT_FEED_FILTERS: { id: MomentFeedFilter; labelKey: string; emoji: string }[] = [
  { id: "trending", labelKey: "moments.filters.trending", emoji: "🔥" },
  { id: "nearby", labelKey: "moments.filters.nearby", emoji: "📍" },
  { id: "new_cafes", labelKey: "moments.filters.newCafes", emoji: "✨" },
  { id: "coffee", labelKey: "moments.filters.coffee", emoji: "☕" },
  { id: "matcha", labelKey: "moments.filters.matcha", emoji: "🍵" },
  { id: "ice_cream", labelKey: "moments.filters.iceCream", emoji: "🍦" },
  { id: "friends", labelKey: "moments.filters.friends", emoji: "👥" },
];

const DRINK_EMOJI: Record<string, string> = {
  coffee: "☕",
  espresso: "☕",
  cappuccino: "🥛",
  matcha: "🍵",
  ice_cream: "🍦",
  juice: "🧃",
  cola: "🥤",
  other: "🎁",
};

export function momentDrinkEmoji(drinkType: string | null | undefined): string {
  if (!drinkType) return "☕";
  return DRINK_EMOJI[drinkType] ?? "☕";
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
