/**
 * CO(X) campaign & reward domain model, TypeScript types aligned with Postgres schema.
 * @see docs/DATA_MODEL_CAMPAIGN_REWARD.md
 */

/** App roles: `partner` = spec's cafe_owner */
export type AppRole = "explorer" | "partner" | "admin";

export type ExplorerLevel =
  | "coffee_rookie"
  | "espresso_explorer"
  | "cappuccino_collector"
  | "matcha_hunter"
  | "local_supporter"
  | "hidden_gem_finder"
  | "eeffoc_pro"
  | "city_explorer"
  | "cofex_ambassador"
  | "local_legend";

export interface PrivacyPreferences {
  show_on_leaderboard?: boolean;
  allow_arrival_signals?: boolean;
  allow_gift_receipt?: boolean;
  marketing_emails?: boolean;
  share_location?: boolean;
}

export interface ExplorerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  /** XP balance (stored as total_points) */
  total_points: number;
  explorer_level: ExplorerLevel;
  total_check_ins: number;
  total_rewards_redeemed: number;
  preferred_drink_categories: string[];
  privacy_preferences: PrivacyPreferences;
  city: string | null;
  handle: string | null;
}

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed?: boolean;
}

export type OpeningHours = Record<string, OpeningHoursDay>;

export interface CafeSocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
}

/** Table: coffee_shops */
export interface Cafe {
  id: string;
  partner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours;
  description: string | null;
  social_links: CafeSocialLinks;
  /** Verification status */
  status: "pending" | "approved" | "rejected" | "suspended" | string;
}

export type CampaignRewardType =
  | "coffee"
  | "espresso"
  | "cappuccino"
  | "matcha"
  | "ice_cream"
  | "juice"
  | "cola"
  | "other";

export type CampaignStatus = "draft" | "active" | "paused" | "expired" | "completed" | "ended";

export interface Campaign {
  id: string;
  coffee_shop_id: string;
  title: string;
  slogan: string;
  description: string | null;
  reward_type: CampaignRewardType;
  reward_description: string | null;
  reward_quantity: number;
  available_quantity: number | null;
  points_reward: number;
  starts_at: string | null;
  ends_at: string | null;
  hashtags: string[];
  cover_image_url: string | null;
  terms_and_conditions: string | null;
  status: CampaignStatus;
  fulfillment_mode: "check_in" | "social_proof" | "hybrid";
  social_requirements: Record<string, unknown>;
}

export type CheckInStatus =
  | "started"
  | "social_pending"
  | "reward_pending"
  | "redeemed"
  | "rejected";

export interface CheckIn {
  id: string;
  user_id: string;
  coffee_shop_id: string;
  campaign_id: string | null;
  created_at: string;
  qr_code_used: string | null;
  location_confirmed: boolean;
  latitude: number | null;
  longitude: number | null;
  check_in_status: CheckInStatus;
  points_awarded: number;
  beverage_tag: string | null;
}

export type SocialProofStatus = "pending" | "approved" | "rejected";

/** View: social_proofs (table: social_submissions) */
export interface SocialProof {
  id: string;
  explorer_id: string;
  campaign_id: string;
  cafe_id: string;
  platform: string;
  post_url: string | null;
  proof_image: string | null;
  verification_status: SocialProofStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
}

export type RewardStatus = "locked" | "unlocked" | "redeemed" | "expired";

/** View: explorer_rewards */
export interface ExplorerReward {
  id: string;
  explorer_id: string;
  campaign_id: string | null;
  catalog_id: string | null;
  reward_code: string;
  qr_value: string;
  status: RewardStatus;
  unlocked_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  source: "campaign" | "catalog";
  label: string | null;
  cafe_id: string | null;
}

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  icon_url: string | null;
  criteria: Record<string, unknown> | null;
  rarity: BadgeRarity;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

/** View: xp_events (table: points_ledger, delta > 0) */
export interface XpEvent {
  id: string;
  user_id: string;
  action_type: string;
  xp_value: number;
  related_id: string | null;
  related_type: string | null;
  metadata: Record<string, unknown> | null;
  event_at: string;
}

/** Role alias for API docs */
export const ROLE_ALIASES: Record<AppRole, string> = {
  explorer: "explorer",
  partner: "cafe_owner",
  admin: "admin",
};

export const DEFAULT_CAMPAIGN_SLOGAN = "We give EEFFOC!";

export const REWARD_TYPES: CampaignRewardType[] = [
  "coffee",
  "espresso",
  "cappuccino",
  "matcha",
  "ice_cream",
  "juice",
  "cola",
  "other",
];

export const CHECK_IN_STATUSES: CheckInStatus[] = [
  "started",
  "social_pending",
  "reward_pending",
  "redeemed",
  "rejected",
];

export const REWARD_STATUSES: RewardStatus[] = ["locked", "unlocked", "redeemed", "expired"];
