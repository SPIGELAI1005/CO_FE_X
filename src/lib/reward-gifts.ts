export function rewardGiftUrl(token: string): string {
  const path = `/gift/${encodeURIComponent(token)}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export type RewardGiftStatus = "pending" | "accepted" | "cancelled";

export interface RewardGiftPreview {
  gift_id: string;
  gift_token: string;
  message: string | null;
  status: RewardGiftStatus;
  sender_id: string;
  sender_name: string;
  sender_handle: string | null;
  recipient_id: string | null;
  campaign_id: string;
  campaign_title: string;
  reward_description: string | null;
  reward_type: string;
  shop_name: string;
  shop_slug: string;
  expires_at: string | null;
  can_accept: boolean;
  is_sender: boolean;
  is_recipient: boolean;
  accepted_at: string | null;
  created_at: string;
}

export interface RewardGiftHistoryItem {
  id: string;
  gift_token: string;
  status: RewardGiftStatus;
  message: string | null;
  created_at: string;
  accepted_at: string | null;
  campaign_title: string;
  shop_name: string;
  sender_name?: string;
  sender_handle?: string | null;
  recipient_name?: string | null;
  recipient_handle?: string | null;
}

export function canGiftCampaignReward(input: {
  rewardStatus?: string | null;
  usedAt?: string | null;
  expiresAt?: string | null;
  giftingEnabled?: boolean | null;
  hasPendingGift?: boolean;
}): boolean {
  if (input.usedAt || input.rewardStatus === "redeemed") return false;
  if (input.rewardStatus === "expired") return false;
  if (input.expiresAt && new Date(input.expiresAt) < new Date()) return false;
  if (input.giftingEnabled === false) return false;
  if (input.hasPendingGift) return false;
  return input.rewardStatus === "unlocked" || (!input.usedAt && !input.rewardStatus);
}
