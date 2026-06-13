import { describe, expect, it } from "vitest";
import { parseVerifyCode } from "./parse-verify-code";

describe("parseVerifyCode", () => {
  it("parses verify URL with code query", () => {
    expect(parseVerifyCode("https://app.cofex.io/partner/verify?code=ABC12345")).toBe("ABC12345");
  });

  it("parses raw alphanumeric code", () => {
    expect(parseVerifyCode("abc12345")).toBe("ABC12345");
  });

  it("strips non-alphanumeric from raw input", () => {
    expect(parseVerifyCode("AB-CD 1234")).toBe("ABCD1234");
  });

  it("rejects too short codes", () => {
    expect(parseVerifyCode("ABC")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseVerifyCode("")).toBeNull();
    expect(parseVerifyCode("   ")).toBeNull();
  });
});
