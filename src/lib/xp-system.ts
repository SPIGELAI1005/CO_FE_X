/** Client mirror of `xp_config`, keep in sync with migration defaults. */

export type XpEventKey =
  | "check_in"
  | "first_check_in"
  | "new_cafe"
  | "new_neighborhood"
  | "campaign_complete"
  | "reward_redeemed"
  | "proof_posted"
  | "social_post"
  | "trail_complete"
  | "badge_unlock"
  | "friend_invite"
  | "friend_joined"
  | "gift_sent"
  | "review"
  | "challenge_reward";

export interface XpEventDefinition {
  key: XpEventKey;
  xpAmount: number;
  labelKey: string;
}

export const XP_EVENT_DEFINITIONS: XpEventDefinition[] = [
  { key: "check_in", xpAmount: 10, labelKey: "xpEvents.checkIn" },
  { key: "first_check_in", xpAmount: 25, labelKey: "xpEvents.firstCheckIn" },
  { key: "new_cafe", xpAmount: 15, labelKey: "xpEvents.newCafe" },
  { key: "new_neighborhood", xpAmount: 20, labelKey: "xpEvents.newNeighborhood" },
  { key: "campaign_complete", xpAmount: 50, labelKey: "xpEvents.campaignComplete" },
  { key: "reward_redeemed", xpAmount: 30, labelKey: "xpEvents.rewardRedeemed" },
  { key: "proof_posted", xpAmount: 10, labelKey: "xpEvents.proofPosted" },
  { key: "social_post", xpAmount: 25, labelKey: "xpEvents.socialPost" },
  { key: "trail_complete", xpAmount: 75, labelKey: "xpEvents.trailComplete" },
  { key: "badge_unlock", xpAmount: 40, labelKey: "xpEvents.badgeUnlock" },
  { key: "friend_invite", xpAmount: 100, labelKey: "xpEvents.friendInvite" },
  { key: "friend_joined", xpAmount: 50, labelKey: "xpEvents.friendJoined" },
  { key: "gift_sent", xpAmount: 15, labelKey: "xpEvents.giftSent" },
  { key: "review", xpAmount: 5, labelKey: "xpEvents.review" },
  { key: "challenge_reward", xpAmount: 50, labelKey: "xpEvents.challengeReward" },
];

const XP_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  XP_EVENT_DEFINITIONS.map((d) => [d.key, d.labelKey]),
);

export function xpEventLabelKey(actionType: string): string {
  return XP_LABEL_KEYS[actionType] ?? "xpEvents.generic";
}

export function formatXpDelta(delta: number): string {
  return `+${delta} XP`;
}
