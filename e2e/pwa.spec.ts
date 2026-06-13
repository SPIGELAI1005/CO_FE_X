import { test, expect } from "@playwright/test";

test.describe("PWA assets", () => {
  test("serves web manifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toContain("CO:FE(X)");
    expect(manifest.start_url).toBeTruthy();
  });

  test("registers service worker script", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body.length).toBeGreaterThan(10);
  });
});
