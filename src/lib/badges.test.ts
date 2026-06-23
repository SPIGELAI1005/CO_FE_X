import { describe, expect, it } from "vitest";
import { badgeProgress, normalizeBadgeRarity, EMPTY_BADGE_STATS } from "@/lib/badges";

describe("badges", () => {
  it("computes campaign completion progress", () => {
    const p = badgeProgress(
      { type: "campaigns_completed", threshold: 5 },
      { ...EMPTY_BADGE_STATS, campaigns_completed: 3 },
    );
    expect(p.current).toBe(3);
    expect(p.threshold).toBe(5);
    expect(p.pct).toBe(60);
  });

  it("computes reward type progress", () => {
    const p = badgeProgress(
      { type: "reward_type_redeemed", value: "matcha", threshold: 5 },
      { ...EMPTY_BADGE_STATS, reward_type_counts: { matcha: 5, coffee: 2 } },
    );
    expect(p.current).toBe(5);
    expect(p.pct).toBe(100);
  });

  it("normalizes rarity", () => {
    expect(normalizeBadgeRarity("legendary")).toBe("legendary");
    expect(normalizeBadgeRarity("bogus")).toBe("common");
  });
});
