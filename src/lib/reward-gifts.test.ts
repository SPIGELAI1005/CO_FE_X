import { describe, expect, it } from "vitest";
import { canGiftCampaignReward } from "./reward-gifts";

describe("canGiftCampaignReward", () => {
  it("allows unlocked unredeemed rewards when gifting enabled", () => {
    expect(
      canGiftCampaignReward({
        rewardStatus: "unlocked",
        usedAt: null,
        expiresAt: null,
        giftingEnabled: true,
        hasPendingGift: false,
      }),
    ).toBe(true);
  });

  it("blocks redeemed, expired, disabled, or pending gifts", () => {
    expect(canGiftCampaignReward({ rewardStatus: "redeemed", giftingEnabled: true })).toBe(false);
    expect(canGiftCampaignReward({ rewardStatus: "expired", giftingEnabled: true })).toBe(false);
    expect(canGiftCampaignReward({ rewardStatus: "unlocked", giftingEnabled: false })).toBe(false);
    expect(canGiftCampaignReward({ rewardStatus: "unlocked", giftingEnabled: true, hasPendingGift: true })).toBe(false);
    expect(
      canGiftCampaignReward({
        rewardStatus: "unlocked",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(false);
  });
});
