import { describe, expect, it } from "vitest";
import {
  buildCaptionTemplate,
  getCampaignExplorerPhase,
  needsSocialProof,
} from "./campaign-fulfillment";

describe("campaign-fulfillment", () => {
  it("builds caption from template", () => {
    const caption = buildCaptionTemplate("Coffee at {shop_name} {hashtag}", {
      shop_name: "Kaffa",
      hashtag: "#EEFFOC",
      campaign_title: "Matcha Week",
    });
    expect(caption).toBe("Coffee at Kaffa #EEFFOC");
  });

  it("detects social proof modes", () => {
    expect(needsSocialProof("social_proof")).toBe(true);
    expect(needsSocialProof("hybrid")).toBe(true);
    expect(needsSocialProof("check_in")).toBe(false);
  });

  it("returns reward phase when redemption exists", () => {
    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "social_proof",
        myCheckIns: 0,
        requiredCheckIns: 1,
        redemptionCode: "ABC12345",
        socialStatus: "approved",
      }),
    ).toBe("reward");
  });
});
