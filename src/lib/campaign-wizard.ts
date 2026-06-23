import type { CampaignFulfillmentMode, CampaignSocialRequirements } from "@/lib/campaign-fulfillment";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

export type WizardTimingPreset = "today_only" | "this_week" | "custom";
export type WizardSocialAction =
  | "instagram_story"
  | "instagram_post"
  | "tiktok"
  | "facebook_post"
  | "any_social"
  | "manual_proof";

/** Platforms partners can combine in the wizard (multi-select). */
export const WIZARD_SOCIAL_PLATFORM_ACTIONS: WizardSocialAction[] = [
  "instagram_story",
  "instagram_post",
  "tiktok",
  "facebook_post",
];

export const WIZARD_MANUAL_PROOF_ACTION: WizardSocialAction = "manual_proof";
export type WizardPublishMode = "draft" | "active" | "scheduled";

export interface WizardActiveHours {
  start: string;
  end: string;
}

export interface WizardFormState {
  reward_type: CampaignRewardType;
  reward_quantity: number;
  max_participants: number;
  daily_redemption_limit: number | null;
  timing_preset: WizardTimingPreset;
  custom_start: string;
  custom_end: string;
  use_active_hours: boolean;
  active_hours_start: string;
  active_hours_end: string;
  social_actions: WizardSocialAction[];
  auto_approve_social: boolean;
  title: string;
  description: string;
  hashtags: string;
  cafe_handle: string;
  terms: string;
  requirements: string;
  points_reward: number;
  publish_mode: WizardPublishMode;
  scheduled_start: string;
}

export const WIZARD_REWARD_TYPES: CampaignRewardType[] = [
  "coffee",
  "espresso",
  "cappuccino",
  "matcha",
  "ice_cream",
  "juice",
  "cola",
  "other",
];

export const WIZARD_SOCIAL_ACTIONS: WizardSocialAction[] = [
  "instagram_story",
  "instagram_post",
  "tiktok",
  "any_social",
  "manual_proof",
];

export interface WizardSmartSuggestion {
  id: string;
  titleKey: string;
  descriptionKey: string;
  emoji: string;
  patch: Partial<WizardFormState>;
}

export const WIZARD_SMART_SUGGESTIONS: WizardSmartSuggestion[] = [
  {
    id: "slow_afternoon",
    titleKey: "campaignWizard.suggestions.slowAfternoon.title",
    descriptionKey: "campaignWizard.suggestions.slowAfternoon.description",
    emoji: "🌤️",
    patch: {
      reward_type: "cappuccino",
      reward_quantity: 10,
      max_participants: 10,
      daily_redemption_limit: 5,
      timing_preset: "today_only",
      use_active_hours: true,
      active_hours_start: "15:00",
      active_hours_end: "17:00",
      social_actions: ["instagram_story"],
      title: "Slow afternoon boost",
      description: "Beat the afternoon slump, free cappuccinos for explorers who share their cozy moment.",
      hashtags: "#SlowAfternoon, #WeGiveEEFFOC",
      points_reward: 15,
    },
  },
  {
    id: "weekend_discovery",
    titleKey: "campaignWizard.suggestions.weekendDiscovery.title",
    descriptionKey: "campaignWizard.suggestions.weekendDiscovery.description",
    emoji: "🗺️",
    patch: {
      reward_type: "coffee",
      reward_quantity: 1,
      max_participants: 40,
      timing_preset: "this_week",
      social_actions: ["instagram_story", "instagram_post", "tiktok", "facebook_post"],
      title: "Weekend discovery",
      description: "Welcome weekend wanderers - share your visit and unlock a free coffee.",
      hashtags: "#WeekendDiscovery, #WeGiveEEFFOC",
      points_reward: 20,
    },
  },
  {
    id: "new_matcha_launch",
    titleKey: "campaignWizard.suggestions.newMatcha.title",
    descriptionKey: "campaignWizard.suggestions.newMatcha.description",
    emoji: "🍵",
    patch: {
      reward_type: "matcha",
      reward_quantity: 1,
      max_participants: 25,
      daily_redemption_limit: 8,
      timing_preset: "this_week",
      social_actions: ["instagram_post"],
      title: "New matcha launch",
      description: "Celebrate our new matcha menu, post a photo and try it on us.",
      hashtags: "#MatchaLaunch, #WeGiveEEFFOC",
      points_reward: 25,
    },
  },
  {
    id: "rainy_day_coffee",
    titleKey: "campaignWizard.suggestions.rainyDay.title",
    descriptionKey: "campaignWizard.suggestions.rainyDay.description",
    emoji: "🌧️",
    patch: {
      reward_type: "coffee",
      reward_quantity: 1,
      max_participants: 20,
      daily_redemption_limit: 10,
      timing_preset: "today_only",
      social_actions: ["instagram_story"],
      title: "Rainy day coffee",
      description: "Grey skies? Warm cup on us when you share your rainy-day ritual.",
      hashtags: "#RainyDayCoffee, #WeGiveEEFFOC",
      points_reward: 15,
    },
  },
  {
    id: "local_hero",
    titleKey: "campaignWizard.suggestions.localHero.title",
    descriptionKey: "campaignWizard.suggestions.localHero.description",
    emoji: "⭐",
    patch: {
      reward_type: "espresso",
      reward_quantity: 1,
      max_participants: 50,
      timing_preset: "this_week",
      social_actions: ["manual_proof"],
      title: "Local hero campaign",
      description: "Reward neighbours who shout us out, show your post at the counter for a free espresso.",
      hashtags: "#LocalHero, #WeGiveEEFFOC",
      points_reward: 20,
    },
  },
  {
    id: "custom_campaign",
    titleKey: "campaignWizard.suggestions.customCampaign.title",
    descriptionKey: "campaignWizard.suggestions.customCampaign.description",
    emoji: "✨",
    patch: {
      reward_type: "coffee",
      reward_quantity: 1,
      max_participants: 50,
      timing_preset: "this_week",
      social_actions: ["instagram_story", "instagram_post"],
      title: "Custom campaign",
      description: "Build your own EEFFOC moment. Tailor the reward, timing and social proof to your café.",
      hashtags: "#WeGiveEEFFOC",
      points_reward: 15,
    },
  },
];

const REWARD_LABELS: Record<CampaignRewardType, string> = {
  coffee: "coffee",
  espresso: "espresso",
  cappuccino: "cappuccino",
  matcha: "matcha",
  ice_cream: "ice cream",
  juice: "juice",
  cola: "cola",
  other: "reward",
};

export function buildRewardDescription(rewardType: CampaignRewardType, quantity: number): string {
  const label = REWARD_LABELS[rewardType];
  if (rewardType === "other") {
    return quantity === 1 ? "1 free reward" : `${quantity} free rewards`;
  }
  return quantity === 1 ? `1 free ${label}` : `${quantity} free ${label}s`;
}

export function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfDay(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC midnight shift). */
export function parseLocalDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function resolveTimingDates(
  preset: WizardTimingPreset,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
): { start: Date; end: Date } {
  if (preset === "today_only") {
    return { start: now, end: endOfDay(now) };
  }
  if (preset === "this_week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start: now, end };
  }
  const start = customStart ? startOfDay(parseLocalDateString(customStart)) : now;
  const end = customEnd ? endOfDay(parseLocalDateString(customEnd)) : endOfDay(start);
  if (end < start) return { start, end: endOfDay(start) };
  return { start, end };
}

export function socialActionToFulfillment(action: WizardSocialAction): CampaignFulfillmentMode {
  return socialActionsToFulfillment([action]);
}

export function socialActionsToFulfillment(actions: WizardSocialAction[]): CampaignFulfillmentMode {
  if (actions.includes("manual_proof")) return "hybrid";
  return "social_proof";
}

export function socialActionPlatforms(action: WizardSocialAction): string[] {
  switch (action) {
    case "instagram_story":
      return ["instagram_story"];
    case "instagram_post":
      return ["instagram_post"];
    case "tiktok":
      return ["tiktok"];
    case "facebook_post":
      return ["facebook_post"];
    case "any_social":
      return ["instagram_story", "instagram_post", "tiktok", "facebook_post"];
    case "manual_proof":
      return ["screenshot"];
    default:
      return [];
  }
}

export function socialActionsToPlatforms(actions: WizardSocialAction[]): string[] {
  const platforms = new Set<string>();
  for (const action of actions) {
    for (const platform of socialActionPlatforms(action)) {
      platforms.add(platform);
    }
  }
  return [...platforms];
}

export function platformsToSocialActions(platforms?: string[]): WizardSocialAction[] {
  if (!platforms?.length) return ["instagram_story"];
  if (platforms.length === 1 && platforms[0] === "screenshot") return ["manual_proof"];

  const actions: WizardSocialAction[] = [];
  const known: WizardSocialAction[] = [
    "instagram_story",
    "instagram_post",
    "tiktok",
    "facebook_post",
  ];
  for (const platform of platforms) {
    if (known.includes(platform as WizardSocialAction)) {
      actions.push(platform as WizardSocialAction);
    }
  }
  return actions.length ? actions : ["instagram_story"];
}

export function toggleWizardSocialAction(
  current: WizardSocialAction[],
  action: WizardSocialAction,
): WizardSocialAction[] {
  if (action === "manual_proof") {
    return current.includes("manual_proof") ? ["instagram_story"] : ["manual_proof"];
  }

  const withoutManual = current.filter((a) => a !== "manual_proof");
  if (withoutManual.includes(action)) {
    const next = withoutManual.filter((a) => a !== action);
    return next.length > 0 ? next : ["instagram_story"];
  }
  return [...withoutManual, action];
}

export function isWizardSocialActionSelected(
  actions: WizardSocialAction[],
  action: WizardSocialAction,
): boolean {
  return actions.includes(action);
}

export function buildWizardSocialRequirements(
  actions: WizardSocialAction[],
  cafeHandle: string,
  title: string,
): CampaignSocialRequirements & { cafe_handle?: string } {
  const handle = cafeHandle.trim().replace(/^@/, "");
  const tag = handle ? `@${handle}` : "{shop_name}";
  const platforms = socialActionsToPlatforms(actions);
  const hints: string[] = [];

  if (actions.includes("instagram_story")) {
    hints.push("Share a story with your drink or the café vibe.");
  }
  if (actions.includes("instagram_post")) {
    hints.push("Post a photo with your hashtag and tag the café.");
  }
  if (actions.includes("tiktok")) {
    hints.push("Short video showing your order or first sip.");
  }
  if (actions.includes("facebook_post")) {
    hints.push("Share a public Facebook post about your visit.");
  }
  if (actions.includes("manual_proof")) {
    hints.push("Check in on-site and show proof at the counter.");
  }
  if (hints.length === 0) {
    hints.push("Photo or video of your visit.");
  }

  return {
    platforms,
    caption_template: `Loved my visit! Tag ${tag}, ${title}`,
    media_hints: hints.join(" "),
    cafe_handle: handle || undefined,
  };
}

export function parseHashtagsInput(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));
}

export function primaryHashtag(hashtags: string[]): string {
  return hashtags[0] ?? "#WeGiveEEFFOC";
}

export function defaultWizardForm(): WizardFormState {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  return {
    reward_type: "coffee",
    reward_quantity: 1,
    max_participants: 50,
    daily_redemption_limit: null,
    timing_preset: "this_week",
    custom_start: today,
    custom_end: weekEnd.toISOString().slice(0, 10),
    use_active_hours: false,
    active_hours_start: "15:00",
    active_hours_end: "17:00",
    social_actions: ["instagram_story"],
    auto_approve_social: false,
    title: "",
    description: "",
    hashtags: "#WeGiveEEFFOC",
    cafe_handle: "",
    terms: "",
    requirements: "",
    points_reward: 15,
    publish_mode: "active",
    scheduled_start: "",
  };
}

export function applySuggestion(
  base: WizardFormState,
  patch: Partial<WizardFormState>,
): WizardFormState {
  return { ...base, ...patch };
}

export function resolvePublishTiming(
  form: WizardFormState,
  now = new Date(),
): { status: "draft" | "active"; startsAt: Date; endsAt: Date; isScheduled: boolean } {
  const { start, end } = resolveTimingDates(
    form.timing_preset,
    form.custom_start,
    form.custom_end,
    now,
  );

  if (form.publish_mode === "draft") {
    return { status: "draft", startsAt: start, endsAt: end, isScheduled: false };
  }

  if (form.publish_mode === "scheduled" && form.scheduled_start) {
    const scheduled = new Date(form.scheduled_start);
    return {
      status: "active",
      startsAt: scheduled,
      endsAt: end < scheduled ? endOfDay(scheduled) : end,
      isScheduled: scheduled > now,
    };
  }

  return { status: "active", startsAt: start, endsAt: end, isScheduled: false };
}

export function buildActiveHoursJson(form: WizardFormState): WizardActiveHours | null {
  if (!form.use_active_hours) return null;
  return { start: form.active_hours_start, end: form.active_hours_end };
}

export function formatQuantityExample(rewardType: CampaignRewardType, quantity: number): string {
  return buildRewardDescription(rewardType, quantity);
}

export const WIZARD_STEP_COUNT = 8;
