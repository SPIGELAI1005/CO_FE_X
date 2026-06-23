import { describe, expect, it } from "vitest";
import { resolveRewardDisplayStatus } from "./shop-door";

describe("resolveRewardDisplayStatus", () => {
  it("returns redeemed when used_at is set", () => {
    expect(resolveRewardDisplayStatus({ usedAt: "2026-06-01T12:00:00Z" })).toBe("redeemed");
  });

  it("returns expired when expires_at is in the past", () => {
    expect(
      resolveRewardDisplayStatus({
        expiresAt: "2020-01-01T12:00:00Z",
      }),
    ).toBe("expired");
  });

  it("returns unlocked for active reward", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(resolveRewardDisplayStatus({ expiresAt: future, rewardStatus: "unlocked" })).toBe("unlocked");
  });
});
