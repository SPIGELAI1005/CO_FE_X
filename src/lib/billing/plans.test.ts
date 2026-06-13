import { describe, expect, it } from "vitest";
import { canCreateActiveCampaign, canCreateShop, limitsForPlan } from "./plans";

describe("plan limits", () => {
  it("listing allows one shop and one campaign", () => {
    expect(limitsForPlan("listing").maxShops).toBe(1);
    expect(limitsForPlan("listing").maxActiveCampaigns).toBe(1);
    expect(canCreateShop(0, false)).toBe(true);
    expect(canCreateShop(1, false)).toBe(false);
    expect(canCreateActiveCampaign(0, "listing")).toBe(true);
    expect(canCreateActiveCampaign(1, "listing")).toBe(false);
  });

  it("pro allows unlimited campaigns", () => {
    expect(canCreateActiveCampaign(99, "pro")).toBe(true);
    expect(canCreateShop(5, true)).toBe(true);
  });
});
