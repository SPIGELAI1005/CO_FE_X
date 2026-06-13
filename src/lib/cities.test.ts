import { describe, expect, it } from "vitest";
import { cityFromSlug, cityToSlug } from "./cities";

describe("city slugs", () => {
  it("round-trips common city names", () => {
    expect(cityToSlug("Lisbon")).toBe("lisbon");
    expect(cityFromSlug("san-francisco")).toBe("San Francisco");
  });
});
