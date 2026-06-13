import { test, expect } from "@playwright/test";

test.describe("Partner routes (authenticated)", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/partner");
    await expect(
      page.getByRole("heading", { name: /Welcome to Partner|Welcome back/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("verify page shows scan and enter tabs", async ({ page }) => {
    await page.goto("/partner/verify");
    await expect(page.getByRole("heading", { name: /Verify redemption code/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Scan/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Enter code/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start camera/i })).toBeVisible();
    await page.getByRole("tab", { name: /Enter code/i }).click();
    await expect(page.getByPlaceholder(/8-character code/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  });

  test("campaigns page loads", async ({ page }) => {
    await page.goto("/partner/campaigns");
    await expect(page.getByRole("heading", { name: /We Give EEFFOC/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /New campaign/i })).toBeVisible();
  });

  test("shop profile page loads", async ({ page }) => {
    await page.goto("/partner/shop");
    await expect(page.getByRole("heading", { name: "Your café profile", level: 1 })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("settings page loads integrations and referrals", async ({ page }) => {
    await page.goto("/partner/settings");
    await expect(page.getByRole("heading", { name: /Integrations & referrals/i })).toBeVisible();
    await expect(page.getByText(/API keys/i).first()).toBeVisible();
    await expect(page.getByText(/Partner referral program/i)).toBeVisible();
  });

  test("submissions page loads", async ({ page }) => {
    await page.goto("/partner/submissions");
    await expect(page.getByRole("heading", { name: /Social submissions/i })).toBeVisible();
  });

  test("rewards catalog page loads", async ({ page }) => {
    await page.goto("/partner/rewards");
    await expect(page.getByRole("heading", { name: /Reward catalog/i })).toBeVisible();
  });

  test("analytics page loads", async ({ page }) => {
    await page.goto("/partner/analytics");
    await expect(page.getByRole("heading", { name: /Campaign performance/i })).toBeVisible();
  });

  test("billing page loads", async ({ page }) => {
    await page.goto("/partner/billing");
    await expect(page.getByRole("heading", { name: /Plans & subscriptions/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("side nav links reach key partner tools", async ({ page }) => {
    await page.goto("/partner");
    await page.locator("aside").getByRole("link", { name: "Verify code", exact: true }).click();
    await expect(page).toHaveURL(/\/partner\/verify/);
    await expect(page.getByRole("heading", { name: /Verify redemption code/i })).toBeVisible();
  });
});
