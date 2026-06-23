import { describe, expect, it } from "vitest";
import { momentAuthorLabel, momentDrinkType, userSharesMoments } from "./moments";
import type { MomentFeedItem } from "./moments";

describe("moments", () => {
  const base: MomentFeedItem = {
    id: "1",
    source_type: "user_moment",
    user_id: "u1",
    explorer_name: "Alex",
    explorer_avatar: null,
    explorer_handle: "alex",
    coffee_shop_id: null,
    shop_name: "Bean Lab",
    shop_slug: "bean-lab",
    shop_cover_url: null,
    campaign_id: null,
    image_path: null,
    image_bucket: null,
    image_url: null,
    drink_type: "matcha",
    badge_slug: null,
    badge_name: null,
    caption: null,
    campaign_slogan: null,
    city: "Berlin",
    distance_km: null,
    like_count: 0,
    save_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    published_at: new Date().toISOString(),
  };

  it("normalizes drink types", () => {
    expect(momentDrinkType("matcha")).toBe("matcha");
    expect(momentDrinkType("ice_cream")).toBe("ice_cream");
    expect(momentDrinkType(null)).toBe("coffee");
  });

  it("prefers café name for campaign highlights", () => {
    expect(momentAuthorLabel({ ...base, source_type: "campaign_highlight" })).toBe("Bean Lab");
    expect(momentAuthorLabel(base)).toBe("Alex");
  });

  it("reads share_moments_publicly preference", () => {
    expect(userSharesMoments({})).toBe(false);
    expect(userSharesMoments({ share_moments_publicly: true })).toBe(true);
  });
});
