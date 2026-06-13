import { test, expect } from "@playwright/test";

test.describe("Public SEO routes", () => {
  test("shows not-found state for unknown café slug", async ({ page }) => {
    await page.goto("/coffee/this-cafe-does-not-exist-e2e");
    await expect(page.getByText("Café not found")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Explore CO:FE\(X\)/i })).toBeVisible();
  });

  test("renders city hub page", async ({ page }) => {
    await page.goto("/city/lisbon");
    await expect(page.getByRole("heading", { name: /Coffee in Lisbon/i })).toBeVisible();
  });
});

test.describe("Guest check-in CTA", () => {
  test("shows sign-in prompt on a real shop when logged out", async ({ page, context }) => {
    const shopSlug = process.env.E2E_SHOP_SLUG;
    test.skip(!shopSlug, "Set E2E_SHOP_SLUG for guest CTA check");

    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 38.7139, longitude: -9.1394 });

    await page.goto(`/coffee/${shopSlug}`);
    await expect(page.getByText(/Sign in to check in/i)).toBeVisible({ timeout: 15_000 });
  });
});
