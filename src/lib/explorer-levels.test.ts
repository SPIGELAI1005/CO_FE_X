import { describe, expect, it } from "vitest";
import { EXPLORER_LEVELS, levelFor, levelNumber } from "@/lib/explorer-levels";

describe("explorer-levels", () => {
  it("defines ten progression tiers", () => {
    expect(EXPLORER_LEVELS).toHaveLength(10);
    expect(EXPLORER_LEVELS[0].key).toBe("coffee_rookie");
    expect(EXPLORER_LEVELS[9].key).toBe("local_legend");
  });

  it("resolves level from XP", () => {
    const { level, levelNum } = levelFor(0);
    expect(level.key).toBe("coffee_rookie");
    expect(levelNum).toBe(1);

    const mid = levelFor(450);
    expect(mid.level.key).toBe("matcha_hunter");
    expect(levelNumber(mid.level)).toBe(4);
  });

  it("caps progress at max level", () => {
    const max = levelFor(20000);
    expect(max.level.key).toBe("local_legend");
    expect(max.next).toBeUndefined();
    expect(max.progress).toBe(100);
  });
});
