import { describe, expect, it } from "vitest";
import {
  canSubmitReview,
  checkInErrorMessage,
  validateCheckIn,
  CHECK_IN_RATE_LIMIT_PER_HOUR,
} from "./check-in";

describe("validateCheckIn", () => {
  const shop = { lat: 38.7139, lon: -9.1394 };

  it("accepts when user is within 200 m", () => {
    const result = validateCheckIn({
      userLatitude: shop.lat + 0.0005,
      userLongitude: shop.lon,
      shopLatitude: shop.lat,
      shopLongitude: shop.lon,
      shopApproved: true,
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("ok");
    expect(result.distanceMetres).toBeLessThan(200);
  });

  it("rejects when user is too far", () => {
    const result = validateCheckIn({
      userLatitude: shop.lat + 0.05,
      userLongitude: shop.lon,
      shopLatitude: shop.lat,
      shopLongitude: shop.lon,
      shopApproved: true,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("too_far");
    expect(checkInErrorMessage(result)).toContain("200 m");
  });

  it("rejects missing GPS", () => {
    expect(
      validateCheckIn({
        userLatitude: null,
        userLongitude: null,
        shopLatitude: shop.lat,
        shopLongitude: shop.lon,
      }).code,
    ).toBe("missing_location");
  });

  it("rejects 24h cooldown", () => {
    const result = validateCheckIn({
      userLatitude: shop.lat,
      userLongitude: shop.lon,
      shopLatitude: shop.lat,
      shopLongitude: shop.lon,
      lastCheckInAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
    expect(result.code).toBe("cooldown");
  });

  it("rejects hourly rate limit", () => {
    const result = validateCheckIn({
      userLatitude: shop.lat,
      userLongitude: shop.lon,
      shopLatitude: shop.lat,
      shopLongitude: shop.lon,
      recentCheckInCountLastHour: CHECK_IN_RATE_LIMIT_PER_HOUR,
    });
    expect(result.code).toBe("rate_limited");
  });
});

describe("canSubmitReview", () => {
  it("requires a check-in within 30 days", () => {
    expect(canSubmitReview(new Date(Date.now() - 10 * 86400000))).toBe(true);
    expect(canSubmitReview(new Date(Date.now() - 40 * 86400000))).toBe(false);
    expect(canSubmitReview(null)).toBe(false);
  });
});
