import { test, expect } from "@playwright/test";

test.describe("Partner routes (guest)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/partner/verify");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
