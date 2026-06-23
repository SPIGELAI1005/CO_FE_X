import { describe, expect, it } from "vitest";
import { formatTrailDistance, formatTrailDuration, trailProgressPct, trailMapCenter } from "@/lib/trails";

describe("trails", () => {
  it("formats distance and duration", () => {
    expect(formatTrailDistance(3200)).toContain("km");
    expect(formatTrailDuration(45)).toContain("min");
  });

  it("computes progress percent", () => {
    expect(trailProgressPct(2, 4)).toBe(50);
    expect(trailProgressPct(5, 4)).toBe(100);
  });

  it("centers map on stops", () => {
    const center = trailMapCenter([
      { latitude: 48.1, longitude: 11.5 },
      { latitude: 48.2, longitude: 11.6 },
    ]);
    expect(center[0]).toBeCloseTo(48.15, 2);
  });
});
