import { describe, expect, it } from "vitest";
import { XP_EVENT_DEFINITIONS, formatXpDelta, xpEventLabelKey } from "@/lib/xp-system";

describe("xp-system", () => {
  it("lists all gameplay XP events", () => {
    const keys = XP_EVENT_DEFINITIONS.map((d) => d.key);
    expect(keys).toContain("first_check_in");
    expect(keys).toContain("reward_redeemed");
    expect(keys).toContain("gift_sent");
    expect(keys).toHaveLength(15);
  });

  it("maps event keys to i18n labels", () => {
    expect(xpEventLabelKey("badge_unlock")).toBe("xpEvents.badgeUnlock");
    expect(xpEventLabelKey("unknown")).toBe("xpEvents.generic");
  });

  it("formats positive XP deltas", () => {
    expect(formatXpDelta(25)).toBe("+25 XP");
  });
});
