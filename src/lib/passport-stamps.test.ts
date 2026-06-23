import { describe, expect, it } from "vitest";
import {
  buildPassportShareSummary,
  computeFavoriteRewardType,
  rewardTypeToStampCategory,
  stampCategoryGradient,
  stampVariantStyle,
} from "@/lib/passport-stamps";

describe("passport-stamps", () => {
  it("computes favorite reward type by frequency", () => {
    const favorite = computeFavoriteRewardType([
      { reward_type: "coffee" },
      { reward_type: "matcha" },
      { reward_type: "coffee" },
    ]);
    expect(favorite).toBe("coffee");
  });

  it("returns null favorite when no stamps", () => {
    expect(computeFavoriteRewardType([])).toBeNull();
  });

  it("builds share summary with key stats", () => {
    const text = buildPassportShareSummary({
      explorerName: "Alex",
      stampCount: 3,
      cafeCount: 2,
      cityCount: 1,
      rewardCount: 3,
      favoriteRewardLabel: "Coffee",
    });
    expect(text).toContain("Alex");
    expect(text).toContain("2 cafés visited");
    expect(text).toContain("Favorite reward: Coffee");
    expect(text).toContain("3 collectible stamps");
  });

  it("clamps stamp variant styles", () => {
    expect(stampVariantStyle(0).border).toBeTruthy();
    expect(stampVariantStyle(99).rotate).toBeDefined();
    expect(stampCategoryGradient("matcha")).toContain("emerald");
  });

  it("maps reward types to stamp categories", () => {
    expect(rewardTypeToStampCategory("matcha")).toBe("matcha");
    expect(rewardTypeToStampCategory("ice_cream")).toBe("ice_cream");
    expect(rewardTypeToStampCategory("espresso")).toBe("coffee");
  });
});
