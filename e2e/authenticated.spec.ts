import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("Authenticated explorer flows", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD for full flows");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill(email!);
    await page.getByPlaceholder("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/(explore|onboarding)/, { timeout: 30_000 });
  });

  test("explorer can open explore map", async ({ page }) => {
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Complete onboarding manually for this test account");
    }
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: /Explore/i })).toBeVisible();
  });

  test("explorer can open leaderboard from Rewards nav", async ({ page }) => {
    if (page.url().includes("/onboarding")) {
      test.skip(true, "Complete onboarding manually for this test account");
    }
    await page.goto("/explore");
    await page.getByRole("button", { name: "Passport, rank, and wallet" }).click();
    await page.getByRole("link", { name: "Rank" }).click();
    await expect(page.getByRole("heading", { name: /Coffee Leaderboard/i })).toBeVisible();
  });

  test("check-in button requests geolocation when near a shop", async ({ page, context }) => {
    const shopSlug = process.env.E2E_SHOP_SLUG;
    test.skip(!shopSlug, "Set E2E_SHOP_SLUG to an approved café slug");

    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({
      latitude: Number(process.env.E2E_SHOP_LAT ?? 38.7139),
      longitude: Number(process.env.E2E_SHOP_LON ?? -9.1394),
    });

    await page.goto(`/coffee/${shopSlug}`);
    const checkIn = page.getByRole("button", { name: /Check in nearby/i });
    await expect(checkIn).toBeVisible({ timeout: 15_000 });
    await checkIn.click();
    await expect(page.getByText(/Check-in confirmed/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/What's next/i)).toBeVisible();
    await page.getByRole("link", { name: /View passport stamp/i }).click();
    await expect(page).toHaveURL(/\/passport/, { timeout: 15_000 });
  });
});
