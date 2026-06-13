import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "@/lib/auth-errors";

describe("friendlyAuthError", () => {
  it("maps invalid login to friendly message", () => {
    expect(friendlyAuthError(new Error("Invalid login credentials"))).toMatch(/incorrect/i);
  });

  it("passes through unknown errors", () => {
    expect(friendlyAuthError(new Error("Custom error"))).toBe("Custom error");
  });
});
