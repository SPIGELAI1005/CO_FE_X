import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export function afterCheckIn(qc: QueryClient, userId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.passport(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.wallet(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.coffeeShops() });
  qc.invalidateQueries({ queryKey: queryKeys.challengeClaims(userId) });
  qc.invalidateQueries({ queryKey: ["coffeeRadar"] });
  qc.invalidateQueries({ queryKey: ["leaderboard"] });
  qc.invalidateQueries({ queryKey: ["myLeaderboardRank"] });
  qc.invalidateQueries({ queryKey: ["userCityCollections"] });
  qc.invalidateQueries({ queryKey: ["cityCollection"] });
}

export function afterChallengeClaim(qc: QueryClient, userId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.challengeClaims(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.wallet(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  qc.invalidateQueries({ queryKey: ["coffeeRadar"] });
  qc.invalidateQueries({ queryKey: ["leaderboard"] });
  qc.invalidateQueries({ queryKey: ["myLeaderboardRank"] });
}

export function afterReview(qc: QueryClient, userId: string, shopId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.shopReviews(shopId) });
  qc.invalidateQueries({ queryKey: queryKeys.myReview(shopId, userId) });
  qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.wallet(userId) });
  qc.invalidateQueries({ queryKey: ["coffeeShop"] });
}

export function afterWalletChange(qc: QueryClient, userId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.wallet(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  qc.invalidateQueries({ queryKey: ["wallet", userId, "ledger"] });
}

export function afterCampaignAction(qc: QueryClient, userId: string, campaignId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) });
  qc.invalidateQueries({ queryKey: queryKeys.activeCampaigns() });
  qc.invalidateQueries({ queryKey: queryKeys.wallet(userId) });
  qc.invalidateQueries({ queryKey: queryKeys.passport(userId) });
}
