/**
 * In-app notification preference categories and defaults.
 */

export type NotificationCategory =
  | "campaigns"
  | "rewards"
  | "social"
  | "badges"
  | "trails"
  | "gifts"
  | "partner_activity"
  | "analytics";

export interface NotificationPreferences {
  in_app_enabled?: boolean;
  categories?: Partial<Record<NotificationCategory, boolean>>;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Required<NotificationPreferences> = {
  in_app_enabled: true,
  categories: {
    campaigns: true,
    rewards: true,
    social: true,
    badges: true,
    trails: true,
    gifts: true,
    partner_activity: true,
    analytics: true,
  },
};

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  campaign_nearby: "campaigns",
  campaign_joined: "campaigns",
  campaign_join: "campaigns",
  campaign_expired: "campaigns",
  campaign_low_quantity: "campaigns",
  seasonal_event_started: "campaigns",
  spawn_nearby: "campaigns",
  reward_unlocked: "rewards",
  reward_expiring_soon: "rewards",
  campaign_code_redeemed: "rewards",
  wallet_code_redeemed: "rewards",
  catalog_redeemed: "rewards",
  campaign_redeemed: "rewards",
  submission_approved: "social",
  submission_rejected: "social",
  social_submission: "social",
  badge_unlocked: "badges",
  points_earned: "badges",
  beans_earned: "badges",
  trail_progress: "trails",
  trail_complete: "trails",
  trail_joined: "trails",
  crawl_complete: "trails",
  gift_received: "gifts",
  reward_gift_received: "gifts",
  reward_gift_accepted: "gifts",
  partner_check_in: "partner_activity",
  partner_reward_redeemed: "partner_activity",
  explorer_arriving: "partner_activity",
  analytics_summary: "analytics",
  partner_application_received: "campaigns",
  partner_application_approved: "campaigns",
  partner_application_rejected: "campaigns",
  referral_used: "campaigns",
};

export const EXPLORER_CATEGORIES: NotificationCategory[] = [
  "campaigns",
  "rewards",
  "social",
  "badges",
  "trails",
  "gifts",
];

export const PARTNER_CATEGORIES: NotificationCategory[] = [
  "partner_activity",
  "social",
  "campaigns",
  "rewards",
  "analytics",
];

export function notificationCategory(type: string): NotificationCategory {
  return TYPE_TO_CATEGORY[type] ?? "campaigns";
}

export function isNotificationEnabled(
  prefs: NotificationPreferences | null | undefined,
  type: string,
): boolean {
  const merged = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prefs,
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...prefs?.categories,
    },
  };
  if (merged.in_app_enabled === false) return false;
  const cat = notificationCategory(type);
  return merged.categories[cat] !== false;
}

export function mergeNotificationPreferences(
  prefs?: NotificationPreferences | null,
): Required<NotificationPreferences> {
  return {
    in_app_enabled: prefs?.in_app_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.in_app_enabled,
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...prefs?.categories,
    },
  };
}
