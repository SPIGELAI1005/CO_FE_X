import type { LucideIcon } from "lucide-react";
import { Camera, Facebook, Image, Music, Paperclip } from "lucide-react";
import type { RewardIconMeta } from "@/lib/reward-icons";

export type SocialPlatform = "tiktok" | "instagram_post" | "instagram_story" | "facebook_post" | "screenshot";

export type SocialPlatformIconMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

export interface SocialPlatformMeta {
  id: SocialPlatform;
  label: string;
  type: "link" | "screenshot";
  composeLabel: string;
  placeholder?: string;
  iconMeta: SocialPlatformIconMeta;
  aspectHint?: "story" | "feed" | "video";
}

export const SOCIAL_PLATFORMS: SocialPlatformMeta[] = [
  {
    id: "instagram_story",
    label: "Instagram Story",
    type: "screenshot",
    composeLabel: "Open Instagram Stories",
    iconMeta: { Icon: Camera, from: "from-fuchsia-400", to: "to-pink-600" },
    aspectHint: "story",
  },
  {
    id: "instagram_post",
    label: "Instagram Post",
    type: "link",
    composeLabel: "Create on Instagram",
    placeholder: "https://instagram.com/p/...",
    iconMeta: { Icon: Image, from: "from-violet-400", to: "to-purple-600" },
    aspectHint: "feed",
  },
  {
    id: "tiktok",
    label: "TikTok",
    type: "link",
    composeLabel: "Create on TikTok",
    placeholder: "https://www.tiktok.com/@you/video/...",
    iconMeta: { Icon: Music, from: "from-slate-700", to: "to-slate-900" },
    aspectHint: "video",
  },
  {
    id: "facebook_post",
    label: "Facebook",
    type: "link",
    composeLabel: "Create on Facebook",
    placeholder: "https://facebook.com/...",
    iconMeta: { Icon: Facebook, from: "from-blue-500", to: "to-blue-700" },
    aspectHint: "feed",
  },
  {
    id: "screenshot",
    label: "Other / manual",
    type: "screenshot",
    composeLabel: "Take a photo",
    iconMeta: { Icon: Paperclip, from: "from-stone-400", to: "to-stone-600" },
  },
];

export function getSocialPlatform(id: string): SocialPlatformMeta | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === id);
}

export function getSocialPlatformIconMeta(id: string): SocialPlatformIconMeta {
  return getSocialPlatform(id)?.iconMeta ?? { Icon: Camera, from: "from-slate-400", to: "to-slate-600" };
}

/** Opens native app or web compose surface; cannot confirm publish programmatically. */
export function openSocialCompose(platform: SocialPlatform, caption: string): void {
  const encoded = encodeURIComponent(caption);
  let url: string;

  switch (platform) {
    case "tiktok":
      url = "https://www.tiktok.com/upload";
      break;
    case "instagram_post":
      url = "https://www.instagram.com/";
      break;
    case "instagram_story":
      url = "https://www.instagram.com/";
      break;
    case "facebook_post":
      url = `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`;
      break;
    default:
      return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function copyCaption(caption: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(caption);
    return true;
  } catch {
    return false;
  }
}
