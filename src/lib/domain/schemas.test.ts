import { describe, expect, it } from "vitest";
import {
  campaignCreateSchema,
  checkInRequestSchema,
  socialProofSubmitSchema,
} from "./schemas";

describe("campaignCreateSchema", () => {
  it("accepts a minimal valid campaign", () => {
    const parsed = campaignCreateSchema.parse({
      title: "Free Matcha Week",
      reward_description: "One matcha on us",
      reward_type: "matcha",
    });
    expect(parsed.slogan).toBe("We give EEFFOC!");
    expect(parsed.reward_quantity).toBe(1);
  });

  it("rejects short titles", () => {
    expect(() =>
      campaignCreateSchema.parse({
        title: "Hi",
        reward_description: "Coffee reward",
      }),
    ).toThrow();
  });
});

describe("checkInRequestSchema", () => {
  it("requires valid coordinates", () => {
    const parsed = checkInRequestSchema.parse({
      shopId: "550e8400-e29b-41d4-a716-446655440000",
      latitude: 38.72,
      longitude: -9.14,
    });
    expect(parsed.beverageTag).toBeUndefined();
  });
});

describe("socialProofSubmitSchema", () => {
  it("requires link url for link submissions", () => {
    expect(() =>
      socialProofSubmitSchema.parse({
        campaignId: "550e8400-e29b-41d4-a716-446655440000",
        platform: "instagram_post",
        submissionType: "link",
      }),
    ).toThrow();
  });

  it("accepts screenshot submissions without URL", () => {
    const parsed = socialProofSubmitSchema.parse({
      campaignId: "550e8400-e29b-41d4-a716-446655440000",
      platform: "instagram_story",
      submissionType: "screenshot",
      caption: "Great matcha!",
    });
    expect(parsed.submissionType).toBe("screenshot");
  });
});
