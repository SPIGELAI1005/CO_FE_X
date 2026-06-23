import { describe, expect, it } from "vitest";
import {
  isDuplicateRedemption,
  isVerifySuccess,
  parseVerifyRedemptionResult,
  verifyResultSeverity,
} from "./verify-redemption";

describe("verify-redemption", () => {
  it("parses successful campaign verification", () => {
    const parsed = parseVerifyRedemptionResult({
      result: "ok",
      redemption_code: "ABC12345",
      kind: "campaign",
      campaign_title: "Matcha Week",
      points_awarded: 30,
    });
    expect(parsed?.result).toBe("ok");
    expect(parsed?.kind).toBe("campaign");
    expect(isVerifySuccess(parsed!.result)).toBe(true);
    expect(verifyResultSeverity(parsed!.result)).toBe("success");
  });

  it("flags duplicate redemption attempts", () => {
    const parsed = parseVerifyRedemptionResult({
      result: "already_used",
      redemption_code: "ABC12345",
      used_at: "2026-06-23T10:00:00.000Z",
    });
    expect(isDuplicateRedemption(parsed!.result)).toBe(true);
    expect(verifyResultSeverity(parsed!.result)).toBe("warn");
  });

  it("classifies expired and invalid codes", () => {
    expect(verifyResultSeverity("expired")).toBe("warn");
    expect(verifyResultSeverity("invalid_token")).toBe("error");
    expect(verifyResultSeverity("not_yours")).toBe("error");
    expect(parseVerifyRedemptionResult({ result: "bogus" })).toBeNull();
  });
});
