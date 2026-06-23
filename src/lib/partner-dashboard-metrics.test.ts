import { describe, expect, it } from "vitest";
import {
  computeRewardsRemaining,
  countActiveCampaigns,
  countNewExplorersToday,
  estimateSocialReachToday,
} from "./partner-dashboard-metrics";

const now = new Date("2026-06-23T12:00:00.000Z");

describe("partner-dashboard-metrics", () => {
  const campaigns = [
    {
      id: "c1",
      status: "active",
      ends_at: "2026-06-30T00:00:00.000Z",
      max_participants: 20,
      available_quantity: 10,
    },
    {
      id: "c2",
      status: "active",
      ends_at: "2026-06-20T00:00:00.000Z",
      max_participants: 5,
      available_quantity: null,
    },
    {
      id: "c3",
      status: "paused",
      ends_at: null,
      max_participants: 10,
      available_quantity: 10,
    },
  ];

  it("counts only active non-expired campaigns", () => {
    expect(countActiveCampaigns(campaigns, now)).toBe(1);
  });

  it("sums remaining rewards across active campaigns", () => {
    const participants = new Map([
      ["c1", 4],
      ["c2", 1],
    ]);
    expect(computeRewardsRemaining(campaigns, participants, now)).toBe(6);
  });

  it("estimates social reach from platform weights", () => {
    expect(estimateSocialReachToday(["instagram_post", "tiktok", "unknown"])).toBe(600 + 1200 + 300);
  });

  it("counts explorers whose first visit was today", () => {
    const firstVisit = new Map([
      ["u1", "2026-06-23T08:00:00.000Z"],
      ["u2", "2026-06-22T08:00:00.000Z"],
    ]);
    expect(countNewExplorersToday(firstVisit, "2026-06-23T00:00:00.000Z")).toBe(1);
  });
});
