import { describe, expect, it } from "vitest";
import { haversineMetres, CHECK_IN_MAX_METRES } from "@/lib/geo";

describe("haversineMetres", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversineMetres(38.7139, -9.1394, 38.7139, -9.1394)).toBeLessThan(1);
  });

  it("computes Lisbon centre to Belém within expected range", () => {
    const metres = haversineMetres(38.7139, -9.1394, 38.6979, -9.2069);
    expect(metres).toBeGreaterThan(5000);
    expect(metres).toBeLessThan(8000);
  });

  it("flags check-ins beyond café radius", () => {
    const shopLat = 38.7139;
    const shopLon = -9.1394;
    const nearby = haversineMetres(shopLat, shopLon, shopLat + 0.0005, shopLon);
    const far = haversineMetres(shopLat, shopLon, shopLat + 0.05, shopLon);
    expect(nearby).toBeLessThan(CHECK_IN_MAX_METRES);
    expect(far).toBeGreaterThan(CHECK_IN_MAX_METRES);
  });
});

describe("queryKeys", () => {
  it("builds stable profile keys", async () => {
    const { queryKeys } = await import("@/lib/queries/keys");
    expect(queryKeys.profile("abc")).toEqual(["profile", "abc"]);
    expect(queryKeys.adminOverview()).toEqual(["adminOverview"]);
  });
});
