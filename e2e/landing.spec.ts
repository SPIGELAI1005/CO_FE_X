import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("shows brand and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /CO:FE\(X\)/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Get started/i })).toBeVisible();
  });

  test("navigates to auth from Get started", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Get started/i }).click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });
});
