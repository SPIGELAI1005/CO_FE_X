import type { CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";

export interface CampaignEditPatch {
  title?: string;
  description?: string;
  reward_description?: string;
  requirements?: string | null;
  hashtag?: string;
  points_reward?: number;
  max_participants?: number | null;
  ends_at?: string | null;
  fulfillment_mode?: CampaignFulfillmentMode;
  auto_approve_social?: boolean;
}

export function getBlockedEditFields(participantCount: number): Set<keyof CampaignEditPatch> {
  if (participantCount <= 0) return new Set();
  return new Set(["fulfillment_mode"]);
}

export function validateCampaignEditPatch(
  patch: CampaignEditPatch,
  current: {
    participantCount: number;
    max_participants: number | null;
    points_reward: number;
    ends_at: string | null;
  },
): string | null {
  const blocked = getBlockedEditFields(current.participantCount);
  for (const key of blocked) {
    if (patch[key] !== undefined) {
      return "Fulfillment mode cannot change after explorers have joined.";
    }
  }
  if (
    patch.max_participants != null &&
    current.max_participants != null &&
    patch.max_participants < current.max_participants
  ) {
    return "Participant cap can only be increased on a live campaign.";
  }
  if (
    patch.max_participants != null &&
    current.participantCount > 0 &&
    patch.max_participants < current.participantCount
  ) {
    return "Participant cap cannot be below current join count.";
  }
  if (
    patch.points_reward != null &&
    current.participantCount > 0 &&
    patch.points_reward < current.points_reward
  ) {
    return "Bonus points can only be increased after explorers have joined.";
  }
  if (patch.ends_at != null && current.ends_at != null && current.participantCount > 0) {
    const next = new Date(patch.ends_at).getTime();
    const prev = new Date(current.ends_at).getTime();
    if (next < prev) return "End date can only be extended on a live campaign.";
  }
  return null;
}
