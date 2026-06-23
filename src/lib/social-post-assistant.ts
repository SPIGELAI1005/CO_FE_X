import { buildCaptionTemplate } from "@/lib/campaign-fulfillment";
import { DISCLOSURE_HASHTAGS } from "@/lib/campaign-compliance";
import { DEFAULT_CAMPAIGN_SLOGAN } from "@/lib/domain/campaign-reward-model";
import type { CafeSocialLinks, CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import type { SocialPlatform } from "@/lib/social-share-links";

export interface SocialPostContext {
  shopName: string;
  shopCity?: string | null;
  shopAddress?: string | null;
  campaignTitle: string;
  campaignSlogan?: string | null;
  hashtags?: string[];
  legacyHashtag?: string | null;
  rewardType?: CampaignRewardType;
  rewardDescription?: string | null;
  socialLinks?: CafeSocialLinks | null;
  captionTemplate?: string | null;
  locale?: string;
}

export interface SocialPostPackage {
  caption: string;
  hashtagsLine: string;
  hashtagList: string[];
  disclosure: string;
  disclosureHashtagsLine: string;
  disclosureShort: string;
  cafeHandle: string | null;
  cafeTag: string | null;
  locationSuggestion: string | null;
  slogan: string;
  drinkLabel: string;
  rewardType: CampaignRewardType;
  fullPostText: string;
}

const BASE_TAGS = ["WeGiveEEFFOC", "COFEX", "CoffeeExplorer"];

export function buildDisclosureText(locale = "en"): string {
  if (locale.startsWith("de")) {
    return "Erhalten im Rahmen einer CO:FE(X)-Reward-Kampagne. Bitte kennzeichne die Kooperation in deinem Post, z. B. mit #ad, #Anzeige oder #Werbung, je nach Land und Plattform.";
  }
  return "Received as part of a CO:FE(X) reward campaign. Please disclose the collaboration in your post, e.g. with #ad, #Anzeige or #Werbung depending on your location and platform.";
}

export function buildDisclosureShort(locale = "en"): string {
  if (locale.startsWith("de")) {
    return "Werbung · CO:FE(X) Reward-Kampagne";
  }
  return "Ad · CO:FE(X) reward campaign";
}

export function buildDisclosureHashtagsLine(): string {
  return DISCLOSURE_HASHTAGS.join(" ");
}

function normalizeHashtag(tag: string): string {
  const t = tag.trim().replace(/^#+/, "");
  return t ? `#${t}` : "";
}

export function collectCampaignHashtags(ctx: SocialPostContext): string[] {
  const fromCampaign = (ctx.hashtags ?? [])
    .map(normalizeHashtag)
    .filter(Boolean);
  const legacy = ctx.legacyHashtag ? [normalizeHashtag(ctx.legacyHashtag)] : [];
  const merged = [...fromCampaign, ...legacy, ...BASE_TAGS.map(normalizeHashtag)];
  return [...new Set(merged)];
}

export function resolveCafeHandle(
  platform: SocialPlatform,
  socialLinks?: CafeSocialLinks | null,
): string | null {
  if (!socialLinks) return null;
  const pick = (raw?: string) => {
    if (!raw?.trim()) return null;
    const v = raw.trim();
    if (v.startsWith("@")) return v;
    try {
      const u = new URL(v.startsWith("http") ? v : `https://${v}`);
      const path = u.pathname.replace(/\/$/, "");
      const seg = path.split("/").filter(Boolean).pop();
      return seg ? `@${seg.replace(/^@/, "")}` : null;
    } catch {
      return v.includes("@") ? v : `@${v.replace(/^@/, "")}`;
    }
  };

  if (platform === "tiktok") return pick(socialLinks.tiktok);
  if (platform === "facebook_post") return pick(socialLinks.facebook);
  if (platform === "instagram_post" || platform === "instagram_story") return pick(socialLinks.instagram);
  return pick(socialLinks.instagram) ?? pick(socialLinks.tiktok);
}

export function buildLocationSuggestion(ctx: SocialPostContext): string | null {
  const parts = [ctx.shopName, ctx.shopCity, ctx.shopAddress].filter(Boolean);
  if (parts.length < 2) return parts[0] ?? null;
  return `${ctx.shopName}${ctx.shopCity ? ` · ${ctx.shopCity}` : ""}`;
}

export function buildSocialPostPackage(
  ctx: SocialPostContext,
  platform: SocialPlatform,
): SocialPostPackage {
  const locale = ctx.locale ?? "en";
  const slogan = ctx.campaignSlogan?.trim() || DEFAULT_CAMPAIGN_SLOGAN;
  const rewardType = ctx.rewardType ?? "coffee";
  const primaryTag = collectCampaignHashtags(ctx)[0] ?? "#WeGiveEEFFOC";
  const caption = buildCaptionTemplate(ctx.captionTemplate ?? undefined, {
    shop_name: ctx.shopName,
    hashtag: primaryTag,
    campaign_title: ctx.campaignTitle,
  });
  const hashtagList = collectCampaignHashtags(ctx);
  const hashtagsLine = hashtagList.join(" ");
  const disclosure = buildDisclosureText(locale);
  const disclosureShort = buildDisclosureShort(locale);
  const disclosureHashtagsLine = buildDisclosureHashtagsLine();
  const cafeHandle = resolveCafeHandle(platform, ctx.socialLinks);
  const cafeTag = cafeHandle ? `Tag ${cafeHandle} in your post` : `Tag ${ctx.shopName} in your post`;
  const locationSuggestion = buildLocationSuggestion(ctx);
  const drinkLabel = ctx.rewardDescription?.trim() || rewardType.replace(/_/g, " ");

  const fullPostText = [
    disclosureShort,
    disclosureHashtagsLine,
    caption,
    hashtagsLine,
    disclosure,
    cafeTag,
    locationSuggestion ? `Location: ${locationSuggestion}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    caption,
    hashtagsLine,
    hashtagList,
    disclosure,
    disclosureHashtagsLine,
    disclosureShort,
    cafeHandle,
    cafeTag,
    locationSuggestion,
    slogan,
    drinkLabel,
    rewardType,
    fullPostText,
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
