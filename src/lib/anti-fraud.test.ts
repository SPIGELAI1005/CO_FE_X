import { describe, expect, it } from "vitest";
import { parseAdminFraudDashboard, userSharesLocation } from "./anti-fraud";

describe("anti-fraud", () => {
  it("defaults share_location to true", () => {
    expect(userSharesLocation(null)).toBe(true);
    expect(userSharesLocation({})).toBe(true);
    expect(userSharesLocation({ share_location: false })).toBe(false);
  });

  it("parses admin fraud dashboard", () => {
    const d = parseAdminFraudDashboard({
      suspicious_users: [{ id: "u1", trust_status: "watch", fraud_score: 5 }],
      qr_failures_7d: 3,
      duplicate_redemptions: [{ id: "r1", code: "ABC", result: "already_used", verified_at: "2026-06-23" }],
    });
    expect(d.suspicious_users).toHaveLength(1);
    expect(d.qr_failures_7d).toBe(3);
    expect(d.duplicate_redemptions).toHaveLength(1);
    expect(d.failed_scans).toEqual([]);
  });
});
