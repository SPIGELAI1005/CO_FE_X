import { describe, expect, it } from "vitest";
import {
  buildRewardDescription,
  endOfDay,
  parseHashtagsInput,
  primaryHashtag,
  resolvePublishTiming,
  resolveTimingDates,
  socialActionPlatforms,
  socialActionToFulfillment,
} from "./campaign-wizard";

describe("campaign-wizard", () => {
  const now = new Date("2026-06-21T10:00:00.000Z");

  it("builds reward descriptions", () => {
    expect(buildRewardDescription("cappuccino", 10)).toBe("10 free cappuccinos");
    expect(buildRewardDescription("coffee", 1)).toBe("1 free coffee");
    expect(buildRewardDescription("matcha", 2)).toBe("2 free matchas");
  });

  it("resolves today_only timing", () => {
    const { start, end } = resolveTimingDates("today_only", undefined, undefined, now);
    expect(start).toEqual(now);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("resolves this_week timing", () => {
    const { start, end } = resolveTimingDates("this_week", undefined, undefined, now);
    expect(start).toEqual(now);
    expect(end.getTime()).toBeGreaterThan(now.getTime());
  });

  it("resolves custom dates", () => {
    const { start, end } = resolveTimingDates("custom", "2026-07-01", "2026-07-05", now);
    expect(start.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(endOfDay(new Date("2026-07-05")).getTime()).toBe(end.getTime());
  });

  it("maps social actions to fulfillment", () => {
    expect(socialActionToFulfillment("instagram_story")).toBe("social_proof");
    expect(socialActionToFulfillment("manual_proof")).toBe("hybrid");
    expect(socialActionPlatforms("any_social").length).toBeGreaterThan(2);
  });

  it("parses hashtags", () => {
    expect(parseHashtagsInput("#Foo, Bar #Baz")).toEqual(["#Foo", "#Bar", "#Baz"]);
    expect(primaryHashtag([])).toBe("#WeGiveEEFFOC");
  });

  it("resolves publish modes", () => {
    const draft = resolvePublishTiming(
      {
        publish_mode: "draft",
        timing_preset: "today_only",
        custom_start: "",
        custom_end: "",
        scheduled_start: "",
      } as never,
      now,
    );
    expect(draft.status).toBe("draft");

    const scheduled = resolvePublishTiming(
      {
        publish_mode: "scheduled",
        timing_preset: "this_week",
        custom_start: "",
        custom_end: "",
        scheduled_start: "2026-06-25T09:00",
      } as never,
      now,
    );
    expect(scheduled.status).toBe("active");
    expect(scheduled.isScheduled).toBe(true);
  });
});
