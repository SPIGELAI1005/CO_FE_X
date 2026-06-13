import { test, expect } from "@playwright/test";

test.describe("Auth UI", () => {
  test("renders sign-in form and toggles sign-up", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.getByRole("button", { name: /Sign up/i }).click();
    await expect(page.getByRole("heading", { name: /Join the network/i })).toBeVisible();
    await expect(page.getByPlaceholder("Name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("links to forgot password", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("link", { name: /Forgot password/i }).click();
    await expect(page).toHaveURL(/\/auth\/forgot/);
  });
});
