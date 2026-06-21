import { z } from "zod";
import { DEFAULT_CAMPAIGN_SLOGAN } from "./campaign-reward-model";

export const privacyPreferencesSchema = z.object({
  show_on_leaderboard: z.boolean().optional(),
  allow_arrival_signals: z.boolean().optional(),
  allow_gift_receipt: z.boolean().optional(),
  marketing_emails: z.boolean().optional(),
});

export const openingHoursDaySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

export const cafeSocialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal("")),
  tiktok: z.string().url().optional().or(z.literal("")),
  facebook: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

export const cafeUpdateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  opening_hours: z.record(openingHoursDaySchema).optional(),
  social_links: cafeSocialLinksSchema.optional(),
});

export const campaignCreateSchema = z.object({
  title: z.string().min(3).max(120),
  slogan: z.string().min(3).max(80).default(DEFAULT_CAMPAIGN_SLOGAN),
  description: z.string().max(2000).optional().nullable(),
  reward_type: z
    .enum(["coffee", "espresso", "cappuccino", "matcha", "ice_cream", "juice", "cola", "other"])
    .default("other"),
  reward_description: z.string().min(3).max(500),
  reward_quantity: z.number().int().min(1).max(100).default(1),
  available_quantity: z.number().int().min(1).nullable().optional(),
  points_reward: z.number().int().min(0).max(10000).default(10),
  hashtags: z.array(z.string().min(1).max(40)).max(10).default([]),
  hashtag: z.string().max(40).optional().nullable(),
  terms_and_conditions: z.string().max(5000).optional().nullable(),
  durationDays: z.number().int().min(1).max(90).default(14),
  max_participants: z.number().int().min(1).nullable().optional(),
  fulfillment_mode: z.enum(["check_in", "social_proof", "hybrid"]).default("check_in"),
});

export const campaignStatusSchema = z.enum(["draft", "active", "paused", "expired", "completed", "ended"]);

export const checkInRequestSchema = z.object({
  shopId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  beverageTag: z.string().max(32).optional(),
  qrCodeUsed: z.string().max(64).optional(),
});

export const checkInStatusSchema = z.enum([
  "started",
  "social_pending",
  "reward_pending",
  "redeemed",
  "rejected",
]);

export const socialProofSubmitSchema = z.object({
  campaignId: z.string().uuid(),
  platform: z.string().min(2).max(40),
  submissionType: z.enum(["link", "screenshot"]),
  url: z.string().url().optional(),
  caption: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.submissionType === "link" && !data.url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL required for link submissions", path: ["url"] });
  }
});

export const rewardStatusSchema = z.enum(["locked", "unlocked", "redeemed", "expired"]);

export const badgeCriteriaSchema = z.object({
  type: z.enum(["check_ins", "unique_shops", "tag", "city", "country", "region_countries", "beverage"]),
  threshold: z.number().int().min(1).optional(),
  value: z.string().optional(),
  countries: z.array(z.string()).optional(),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CheckInRequestInput = z.infer<typeof checkInRequestSchema>;
export type SocialProofSubmitInput = z.infer<typeof socialProofSubmitSchema>;
