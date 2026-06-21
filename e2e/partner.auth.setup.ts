import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "");
Object.assign(process.env, env);

const authFile = path.join("e2e", ".auth", "partner.json");
const email = process.env.E2E_PARTNER_EMAIL ?? "e2e-partner@cofex.test";
const password = process.env.E2E_PARTNER_PASSWORD ?? "CofexE2ePartner!2026";

async function ensurePartnerAccount() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env for partner e2e setup");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | undefined;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Partner" },
  });

  if (created.user?.id) {
    userId = created.user.id;
  } else if (createError?.message.toLowerCase().includes("already")) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (!userId) throw new Error(`Partner user ${email} exists but could not be resolved`);
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateError) throw updateError;
  } else if (createError) {
    throw createError;
  }

  if (!userId) throw new Error("Could not provision partner test user");

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const hasPartner = (roles ?? []).some((r) => r.role === "partner");
  if (!hasPartner) {
    const { error: roleError } = await admin.from("user_roles").insert({ user_id: userId, role: "partner" });
    if (roleError) throw roleError;
  }
}

setup("authenticate as partner", async ({ page }) => {
  await ensurePartnerAccount();

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.addInitScript(() => {
    localStorage.setItem("cofex-locale", "en");
  });

  await page.goto("/auth");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(partner|explore|profile|onboarding)/, { timeout: 30_000 });

  await page.goto("/partner");
  await expect(page).toHaveURL(/\/partner/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", { name: /Welcome to Partner|Welcome back/i }),
  ).toBeVisible({ timeout: 20_000 });

  await page.context().storageState({ path: authFile });
});
