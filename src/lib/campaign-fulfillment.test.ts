import { describe, expect, it } from "vitest";
import {
  buildCaptionTemplate,
  getCampaignExplorerPhase,
  needsSocialProof,
  parseSocialRequirements,
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

  it("returns ended before full for joined explorers", () => {
    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: true,
        full: true,
        fulfillmentMode: "check_in",
        myCheckIns: 0,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("ended");
  });

  it("returns full only for non-joined explorers", () => {
    expect(
      getCampaignExplorerPhase({
        joined: false,
        ended: false,
        full: true,
        fulfillmentMode: "check_in",
        myCheckIns: 0,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("full");
  });

  it("parses social requirements JSON", () => {
    expect(
      parseSocialRequirements({
        platforms: ["instagram_post"],
        caption_template: "Visit {shop_name}",
      }).caption_template,
    ).toBe("Visit {shop_name}");
  });
});
