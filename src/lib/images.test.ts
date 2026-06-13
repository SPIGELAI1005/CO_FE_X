import { describe, expect, it } from "vitest";
import { optimizeImageUrl } from "./images";

describe("optimizeImageUrl", () => {
  it("returns undefined for empty input", () => {
    expect(optimizeImageUrl(null)).toBeUndefined();
  });

  it("transforms Supabase public storage URLs", () => {
    const url =
      "https://abc.supabase.co/storage/v1/object/public/shop-images/user/photo.jpg";
    const out = optimizeImageUrl(url, { width: 400 });
    expect(out).toContain("/storage/v1/render/image/public/shop-images/user/photo.jpg");
    expect(out).toContain("width=400");
    expect(out).toContain("format=webp");
  });

  it("passes through non-storage URLs", () => {
    const url = "https://example.com/photo.jpg";
    expect(optimizeImageUrl(url)).toBe(url);
  });
});
