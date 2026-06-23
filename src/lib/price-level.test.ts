import { describe, expect, it } from "vitest";
import { formatPriceLevel } from "./price-level";

describe("formatPriceLevel", () => {
  it("uses euro symbols by default", () => {
    expect(formatPriceLevel(1)).toBe("€");
    expect(formatPriceLevel(2)).toBe("€€");
    expect(formatPriceLevel(4)).toBe("€€€€");
  });

  it("supports neutral tier dots", () => {
    expect(formatPriceLevel(3, "neutral")).toBe("···");
  });

  it("clamps out-of-range values", () => {
    expect(formatPriceLevel(0)).toBe("€");
    expect(formatPriceLevel(9)).toBe("€€€€");
  });
});
