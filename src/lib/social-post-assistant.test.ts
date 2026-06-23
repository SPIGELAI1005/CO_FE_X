import { describe, expect, it } from "vitest";
import {
  buildDisclosureText,
  buildSocialPostPackage,
  collectCampaignHashtags,
  resolveCafeHandle,
} from "./social-post-assistant";

describe("social-post-assistant", () => {
  const baseCtx = {
    shopName: "Bean Lab",
    shopCity: "Berlin",
    campaignTitle: "Matcha Week",
    hashtags: ["MatchaMagic"],
    socialLinks: { instagram: "https://instagram.com/beanlab" },
  };

  it("builds disclosure in EN and DE", () => {
    expect(buildDisclosureText("en")).toContain("#ad");
    expect(buildDisclosureText("de")).toContain("#Anzeige");
  });

  it("collects unique hashtags", () => {
    const tags = collectCampaignHashtags({ ...baseCtx, legacyHashtag: "#MatchaMagic" });
    expect(tags).toContain("#MatchaMagic");
    expect(tags).toContain("#WeGiveEEFFOC");
  });

  it("resolves instagram handle from URL", () => {
    expect(resolveCafeHandle("instagram_post", { instagram: "https://instagram.com/beanlab" })).toBe("@beanlab");
  });

  it("builds full post package", () => {
    const pkg = buildSocialPostPackage(baseCtx, "instagram_post");
    expect(pkg.caption).toContain("Bean Lab");
    expect(pkg.hashtagsLine).toContain("#MatchaMagic");
    expect(pkg.disclosure).toContain("CO:FE(X)");
    expect(pkg.cafeHandle).toBe("@beanlab");
    expect(pkg.fullPostText).toContain(pkg.caption);
  });
});
