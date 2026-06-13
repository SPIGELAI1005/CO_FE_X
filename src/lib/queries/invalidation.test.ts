import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  afterCampaignAction,
  afterChallengeClaim,
  afterCheckIn,
  afterReview,
  afterWalletChange,
} from "./invalidation";
import { queryKeys } from "./keys";

function createSpyClient() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, "invalidateQueries");
  return { qc, spy };
}

describe("query invalidation helpers", () => {
  it("afterCheckIn invalidates profile, passport, wallet, shops, and rank caches", () => {
    const { qc, spy } = createSpyClient();
    afterCheckIn(qc, "user-1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.profile("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.passport("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.coffeeShops() });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.challengeClaims("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["myLeaderboardRank"] });
  });

  it("afterChallengeClaim invalidates claims, wallet, profile, radar, and leaderboard", () => {
    const { qc, spy } = createSpyClient();
    afterChallengeClaim(qc, "user-1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.challengeClaims("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.profile("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["coffeeRadar"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["leaderboard"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["myLeaderboardRank"] });
  });

  it("afterReview invalidates shop reviews, profile, and wallet", () => {
    const { qc, spy } = createSpyClient();
    afterReview(qc, "user-1", "shop-1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.shopReviews("shop-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.myReview("shop-1", "user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.profile("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet("user-1") });
  });

  it("afterWalletChange invalidates wallet and ledger prefix", () => {
    const { qc, spy } = createSpyClient();
    afterWalletChange(qc, "user-1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.wallet("user-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["wallet", "user-1", "ledger"] });
  });

  it("afterCampaignAction invalidates campaign and explorer caches", () => {
    const { qc, spy } = createSpyClient();
    afterCampaignAction(qc, "user-1", "camp-1");
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.campaign("camp-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.activeCampaigns() });
  });
});
