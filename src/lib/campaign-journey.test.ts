import { describe, expect, it } from "vitest";
import { canJoinCampaign } from "./campaign-availability";
import { getCampaignExplorerPhase, needsSocialProof } from "./campaign-fulfillment";
import { resolveMissionSteps } from "./campaign-mission";
import { parseVerifyInput } from "./parse-verify-code";
import { resolveRewardDisplayStatus } from "./shop-door";
import { isDuplicateRedemption, parseVerifyRedemptionResult } from "./verify-redemption";
import { XP_EVENT_DEFINITIONS } from "./xp-system";
import { badgeProgress, EMPTY_BADGE_STATS } from "./badges";
import { rewardTypeToStampCategory } from "./passport-stamps";

const now = new Date("2026-06-23T12:00:00.000Z");

function xpAmount(key: string) {
  return XP_EVENT_DEFINITIONS.find((d) => d.key === key)?.xpAmount ?? 0;
}

describe("core explorer journey - check-in campaign", () => {
  const baseCampaign = {
    status: "active",
    endsAt: "2026-06-30T00:00:00.000Z",
    availableQuantity: 10,
    maxParticipants: null,
    participantCount: 2,
    now,
  };

  it("discovers and joins an active campaign", () => {
    expect(canJoinCampaign(baseCampaign)).toEqual({ ok: true });
    expect(
      getCampaignExplorerPhase({
        joined: false,
        ended: false,
        full: false,
        fulfillmentMode: "check_in",
        myCheckIns: 0,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("join");
  });

  it("progresses through check-in to reward unlock", () => {
    const beforeCheckIn = getCampaignExplorerPhase({
      joined: true,
      ended: false,
      full: false,
      fulfillmentMode: "check_in",
      myCheckIns: 0,
      requiredCheckIns: 1,
      redemptionCode: null,
      socialStatus: "none",
    });
    expect(beforeCheckIn).toBe("check_in");

    const afterUnlock = getCampaignExplorerPhase({
      joined: true,
      ended: false,
      full: false,
      fulfillmentMode: "check_in",
      myCheckIns: 1,
      requiredCheckIns: 1,
      redemptionCode: "ABC12345",
      socialStatus: "none",
    });
    expect(afterUnlock).toBe("reward");
    expect(resolveRewardDisplayStatus({ rewardStatus: "unlocked" })).toBe("unlocked");
  });

  it("awards XP for check-in and redemption milestones", () => {
    expect(xpAmount("check_in")).toBeGreaterThan(0);
    expect(xpAmount("reward_redeemed")).toBeGreaterThan(0);
    expect(xpAmount("campaign_complete")).toBeGreaterThan(0);
  });

  it("maps redeemed reward to passport stamp category", () => {
    expect(rewardTypeToStampCategory("matcha")).toBe("matcha");
    expect(rewardTypeToStampCategory("coffee")).toBe("coffee");
  });
});

describe("core explorer journey - social proof campaign", () => {
  it("requires proof submission and café approval before reward", () => {
    expect(needsSocialProof("social_proof")).toBe(true);

    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "social_proof",
        myCheckIns: 0,
        requiredCheckIns: 0,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("social_post");

    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "social_proof",
        myCheckIns: 0,
        requiredCheckIns: 0,
        redemptionCode: null,
        socialStatus: "pending",
      }),
    ).toBe("pending_review");

    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "social_proof",
        myCheckIns: 0,
        requiredCheckIns: 0,
        redemptionCode: "XYZ98765",
        socialStatus: "approved",
      }),
    ).toBe("reward");
  });

  it("tracks mission steps through social approval", () => {
    const steps = resolveMissionSteps({
      fulfillmentMode: "social_proof",
      joined: true,
      phase: "pending_review",
      myCheckIns: 0,
      requiredCheckIns: 0,
      hasSocialSubmission: true,
      latestSocialStatus: "pending",
      hasRedemption: false,
      rewardUsed: false,
    });
    expect(steps.find((s) => s.id === "cafe_confirms")?.status).toBe("current");
  });
});

describe("core explorer journey - hybrid campaign", () => {
  it("requires check-in before social post", () => {
    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "hybrid",
        myCheckIns: 0,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("check_in");

    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: false,
        full: false,
        fulfillmentMode: "hybrid",
        myCheckIns: 1,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("social_post");
  });
});

describe("core partner journey - verify and quantity", () => {
  it("parses QR verify input with rotating token", () => {
    expect(parseVerifyInput("ABC12345 654321")).toEqual({
      code: "ABC12345",
      rotatingToken: "654321",
    });
  });

  it("blocks duplicate redemption at counter", () => {
    const secondScan = parseVerifyRedemptionResult({
      result: "already_used",
      redemption_code: "ABC12345",
      used_at: "2026-06-23T11:00:00.000Z",
    });
    expect(isDuplicateRedemption(secondScan!.result)).toBe(true);
    expect(resolveRewardDisplayStatus({ usedAt: "2026-06-23T11:00:00.000Z" })).toBe("redeemed");
  });

  it("decreases available quantity as participants join", () => {
    const before = canJoinCampaign({
      status: "active",
      endsAt: "2026-06-30T00:00:00.000Z",
      availableQuantity: 2,
      maxParticipants: null,
      participantCount: 1,
      now,
    });
    expect(before.ok).toBe(true);

    const after = canJoinCampaign({
      status: "active",
      endsAt: "2026-06-30T00:00:00.000Z",
      availableQuantity: 2,
      maxParticipants: null,
      participantCount: 2,
      now,
    });
    expect(after).toEqual({ ok: false, reason: "full" });
  });
});

describe("badge unlock after campaign completion", () => {
  it("tracks progress toward campaign completion badge", () => {
    const progress = badgeProgress(
      { type: "campaigns_completed", threshold: 3 },
      { ...EMPTY_BADGE_STATS, campaigns_completed: 2 },
    );
    expect(progress.pct).toBeCloseTo(66.67, 0);
    expect(xpAmount("badge_unlock")).toBe(40);
  });
});

describe("expired campaign handling", () => {
  it("ends explorer phase and blocks new joins", () => {
    expect(
      getCampaignExplorerPhase({
        joined: true,
        ended: true,
        full: false,
        fulfillmentMode: "check_in",
        myCheckIns: 1,
        requiredCheckIns: 1,
        redemptionCode: null,
        socialStatus: "none",
      }),
    ).toBe("ended");

    expect(
      canJoinCampaign({
        status: "active",
        endsAt: "2026-06-20T00:00:00.000Z",
        availableQuantity: 5,
        maxParticipants: null,
        participantCount: 0,
        now,
      }),
    ).toEqual({ ok: false, reason: "expired" });
  });
});
