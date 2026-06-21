import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;
const env = loadEnv("production", process.cwd(), "");
Object.assign(process.env, env);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "partner-setup", testMatch: /partner\.auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/partner\.auth\.setup\.ts/, /partner-routes\.spec\.ts/],
    },
    {
      name: "partner-guest",
      testMatch: /partner-guest\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "partner-chromium",
      testMatch: /partner-routes\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/partner.json",
      },
      dependencies: ["partner-setup"],
    },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      SUPABASE_URL: env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
      SUPABASE_PUBLISHABLE_KEY:
        env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY:
        env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});
