import { describe, expect, it } from "vitest";
import { getMissionStepDefinitions, missionProgressPercent, resolveMissionSteps } from "@/lib/campaign-mission";

describe("resolveMissionSteps", () => {
  it("marks discover as current before join on check-in missions", () => {
    const steps = resolveMissionSteps({
      fulfillmentMode: "check_in",
      joined: false,
      phase: "join",
      myCheckIns: 0,
      requiredCheckIns: 1,
      hasSocialSubmission: false,
      latestSocialStatus: "none",
      hasRedemption: false,
      rewardUsed: false,
    });
    const discover = steps.find((s) => s.id === "discover");
    expect(discover?.status).toBe("current");
  });

  it("skips social steps for check-in only campaigns", () => {
    const steps = resolveMissionSteps({
      fulfillmentMode: "check_in",
      joined: true,
      phase: "check_in",
      myCheckIns: 0,
      requiredCheckIns: 1,
      hasSocialSubmission: false,
      latestSocialStatus: "none",
      hasRedemption: false,
      rewardUsed: false,
    });
    expect(steps.find((s) => s.id === "social_post")?.status).toBe("skipped");
    expect(steps.find((s) => s.id === "visit")?.status).toBe("current");
  });

  it("includes all social steps for hybrid missions", () => {
    const defs = getMissionStepDefinitions("hybrid");
    const requiredIds = defs.filter((d) => d.required).map((d) => d.id);
    expect(requiredIds).toContain("check_in");
    expect(requiredIds).toContain("submit_proof");
    expect(requiredIds).toContain("cafe_confirms");
  });
});

describe("missionProgressPercent", () => {
  it("returns partial credit for current step", () => {
    const steps = resolveMissionSteps({
      fulfillmentMode: "check_in",
      joined: true,
      phase: "check_in",
      myCheckIns: 0,
      requiredCheckIns: 1,
      hasSocialSubmission: false,
      latestSocialStatus: "none",
      hasRedemption: false,
      rewardUsed: false,
    });
    const pct = missionProgressPercent(steps);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});
