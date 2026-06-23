export type CampaignFulfillmentMode = "check_in" | "social_proof" | "hybrid";

export interface CampaignSocialRequirements {
  platforms?: string[];
  caption_template?: string;
  media_hints?: string;
}

export const FULFILLMENT_MODE_LABELS: Record<CampaignFulfillmentMode, string> = {
  check_in: "Check-in at café",
  social_proof: "Social post required",
  hybrid: "Check-in + social post",
};

export const FULFILLMENT_MODE_DESCRIPTIONS: Record<CampaignFulfillmentMode, string> = {
  check_in: "Explorers check in at your café, then unlock a reward code at the counter.",
  social_proof: "Explorers post on social media, submit proof and receive a reward QR after you approve.",
  hybrid: "Explorers check in first, then post on social. Reward unlocks after post approval.",
};

export function parseSocialRequirements(raw: unknown): CampaignSocialRequirements {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    platforms: Array.isArray(o.platforms) ? o.platforms.map(String) : undefined,
    caption_template: typeof o.caption_template === "string" ? o.caption_template : undefined,
    media_hints: typeof o.media_hints === "string" ? o.media_hints : undefined,
  };
}

export function needsSocialProof(mode: CampaignFulfillmentMode): boolean {
  return mode === "social_proof" || mode === "hybrid";
}

export function needsCheckInForRedeem(mode: CampaignFulfillmentMode): boolean {
  return mode === "check_in" || mode === "hybrid";
}

export function canRedeemViaButton(mode: CampaignFulfillmentMode): boolean {
  return mode === "check_in" || mode === "hybrid";
}

export function buildCaptionTemplate(
  template: string | undefined,
  vars: { shop_name: string; hashtag: string; campaign_title: string },
): string {
  const base =
    template ?? "Loved my visit to {shop_name}! {hashtag} #WeGiveEEFFOC";
  return base
    .replace(/\{shop_name\}/g, vars.shop_name)
    .replace(/\{hashtag\}/g, vars.hashtag)
    .replace(/\{campaign_title\}/g, vars.campaign_title);
}

export function campaignParticipationUrl(campaignId: string, token?: string | null): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (token) return `${origin}/campaign/${campaignId}?src=qr&token=${token}`;
    return `${origin}/campaign/${campaignId}?src=qr`;
  }
  return `/campaign/${campaignId}?src=qr`;
}

export function campaignVerifyUrl(redemptionCode: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/partner/verify?code=${encodeURIComponent(redemptionCode)}`;
  }
  return `/partner/verify?code=${encodeURIComponent(redemptionCode)}`;
}

export type CampaignExplorerPhase =
  | "join"
  | "check_in"
  | "social_post"
  | "pending_review"
  | "reward"
  | "ended"
  | "full";

export function getCampaignExplorerPhase(input: {
  joined: boolean;
  ended: boolean;
  full: boolean;
  fulfillmentMode: CampaignFulfillmentMode;
  myCheckIns: number;
  requiredCheckIns: number;
  redemptionCode: string | null;
  socialStatus: "none" | "pending" | "approved" | "rejected";
}): CampaignExplorerPhase {
  if (input.ended) return "ended";
  if (input.full && !input.joined) return "full";
  if (input.redemptionCode) return "reward";
  if (!input.joined) return "join";

  if (needsSocialProof(input.fulfillmentMode)) {
    if (input.socialStatus === "pending") return "pending_review";
    if (input.socialStatus === "approved") return "reward";
    if (input.fulfillmentMode === "hybrid") {
      const qualified = input.myCheckIns >= input.requiredCheckIns;
      if (!qualified) return "check_in";
    }
    return "social_post";
  }

  const qualified = input.myCheckIns >= input.requiredCheckIns;
  if (!qualified) return "check_in";
  return "check_in";
}
