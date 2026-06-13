import { describe, expect, it } from "vitest";
import { getBlockedEditFields, validateCampaignEditPatch } from "./partner-campaign-edit";

describe("partner-campaign-edit", () => {
  it("blocks fulfillment_mode when participants exist", () => {
    expect(getBlockedEditFields(3).has("fulfillment_mode")).toBe(true);
    expect(getBlockedEditFields(0).has("fulfillment_mode")).toBe(false);
  });

  it("rejects lowering max participants", () => {
    const err = validateCampaignEditPatch(
      { max_participants: 50 },
      { participantCount: 10, max_participants: 100, points_reward: 10, ends_at: null },
    );
    expect(err).toMatch(/increased/i);
  });
});
