import { describe, expect, it } from "vitest";
import { isNotificationEnabled, notificationCategory } from "./notification-preferences";

describe("notification-preferences", () => {
  it("maps types to categories", () => {
    expect(notificationCategory("badge_unlocked")).toBe("badges");
    expect(notificationCategory("partner_check_in")).toBe("partner_activity");
  });

  it("respects master and category toggles", () => {
    expect(isNotificationEnabled(null, "reward_unlocked")).toBe(true);
    expect(isNotificationEnabled({ in_app_enabled: false }, "reward_unlocked")).toBe(false);
    expect(
      isNotificationEnabled({ categories: { rewards: false } }, "reward_expiring_soon"),
    ).toBe(false);
  });
});
