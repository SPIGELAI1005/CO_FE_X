import { describe, expect, it } from "vitest";
import { getPostCheckInActions } from "./post-check-in-actions";

describe("getPostCheckInActions", () => {
  it("omits campaign when no campaigns", () => {
    const actions = getPostCheckInActions({ campaigns: [] });
    expect(actions.some((a) => a.id === "campaign")).toBe(false);
    expect(actions.filter((a) => a.id === "write_review")).toHaveLength(1);
    expect(actions.filter((a) => a.id === "passport")).toHaveLength(1);
  });

  it("puts claimable challenge first", () => {
    const actions = getPostCheckInActions({
      claimableChallenge: { title: "Weekly Wanderer", reward: 50 },
    });
    expect(actions[0].id).toBe("claimable_challenge");
    expect(actions[0].title).toContain("Weekly Wanderer");
  });

  it("includes city almost-done row when one away from target", () => {
    const actions = getPostCheckInActions({
      cityProgress: { cityName: "Lisbon", visited: 4, target: 5 },
    });
    expect(actions.some((a) => a.id === "city_almost_done")).toBe(true);
  });

  it("skips city row when not near completion", () => {
    const actions = getPostCheckInActions({
      cityProgress: { cityName: "Lisbon", visited: 2, target: 5 },
    });
    expect(actions.some((a) => a.id === "city_almost_done")).toBe(false);
  });
});
