import { describe, expect, it } from "vitest";
import {
  buildChallengeView,
  getChallengeProgress,
  isChallengeClaimed,
  weeklyResetLabel,
  limitedCountdownLabel,
  type ChallengeClaimRecord,
} from "@/lib/explorer-challenges";
import type { RadarStats } from "@/lib/queries/radar";
import { EXPLORER_CHALLENGES } from "@/lib/explorer-challenges";

const baseStats: RadarStats = {
  total_check_ins: 10,
  total_points: 200,
  visits_this_week: 5,
  new_shops_this_week: 3,
  unique_shops: 8,
  cities_explored: 3,
  active_campaigns: 1,
  streak_days: 5,
};

describe("explorer challenges", () => {
  it("reads progress from radar stats", () => {
    const weekly = EXPLORER_CHALLENGES[0];
    expect(getChallengeProgress(baseStats, weekly)).toBe(5);
  });

  it("marks weekly challenge claimable when complete and unclaimed", () => {
    const views = buildChallengeView(baseStats, [], "2026-W24");
    const weekly = views.find((v) => v.challenge.id === "weekly");
    expect(weekly?.claimable).toBe(true);
  });

  it("detects claimed weekly challenge for matching period", () => {
    const claims: ChallengeClaimRecord[] = [
      { challenge_id: "weekly", period_key: "2026-W24", claimed_at: new Date().toISOString(), points_awarded: 50 },
    ];
    expect(isChallengeClaimed(claims, EXPLORER_CHALLENGES[0], "2026-W24")).toBe(true);
    expect(isChallengeClaimed(claims, EXPLORER_CHALLENGES[0], "2026-W25")).toBe(false);
  });

  it("uses lifetime period for milestone challenges", () => {
    const claims: ChallengeClaimRecord[] = [
      { challenge_id: "cities", period_key: "lifetime", claimed_at: new Date().toISOString(), points_awarded: 150 },
    ];
    expect(isChallengeClaimed(claims, EXPLORER_CHALLENGES[3], "2026-W24")).toBe(true);
  });

  it("describes weekly reset copy", () => {
    const weekly = EXPLORER_CHALLENGES[0];
    expect(weeklyResetLabel(weekly, "2026-W24")).toContain("2026-W24");
    expect(weeklyResetLabel(EXPLORER_CHALLENGES[2])).toBeNull();
  });

  it("describes limited countdown copy", () => {
    const limited = {
      ...EXPLORER_CHALLENGES[0],
      id: "matcha-week",
      period: "limited" as const,
      endsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    };
    expect(limitedCountdownLabel(limited)).toMatch(/left|today/i);
  });
});
