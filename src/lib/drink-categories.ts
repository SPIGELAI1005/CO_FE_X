import { resolveRewardIconMeta } from "@/lib/reward-icons";

export const DRINK_CATEGORIES = [
  "espresso",
  "cappuccino",
  "latte",
  "americano",
  "matcha",
  "tea",
  "cola",
  "juice",
  "ice_cream",
  "other",
] as const;

export type DrinkCategory = (typeof DRINK_CATEGORIES)[number];

export interface DrinkCategoryMeta {
  id: DrinkCategory;
  labelKey: string;
}

export function drinkCategoryIconMeta(id: string) {
  return resolveRewardIconMeta(id);
}

export const DRINK_CATEGORY_META: DrinkCategoryMeta[] = [
  { id: "espresso", labelKey: "drinkTracker.categories.espresso" },
  { id: "cappuccino", labelKey: "drinkTracker.categories.cappuccino" },
  { id: "latte", labelKey: "drinkTracker.categories.latte" },
  { id: "americano", labelKey: "drinkTracker.categories.americano" },
  { id: "matcha", labelKey: "drinkTracker.categories.matcha" },
  { id: "tea", labelKey: "drinkTracker.categories.tea" },
  { id: "cola", labelKey: "drinkTracker.categories.cola" },
  { id: "juice", labelKey: "drinkTracker.categories.juice" },
  { id: "ice_cream", labelKey: "drinkTracker.categories.iceCream" },
  { id: "other", labelKey: "drinkTracker.categories.other" },
];

const REWARD_TYPE_MAP: Record<string, DrinkCategory> = {
  espresso: "espresso",
  cappuccino: "cappuccino",
  latte: "latte",
  americano: "americano",
  matcha: "matcha",
  tea: "tea",
  cola: "cola",
  juice: "juice",
  ice_cream: "ice_cream",
  coffee: "other",
  other: "other",
};

export function resolveDrinkCategory(rewardType: string | null | undefined): DrinkCategory {
  const key = (rewardType ?? "").trim().toLowerCase();
  return REWARD_TYPE_MAP[key] ?? "other";
}

export function drinkCategoryMeta(id: string | null | undefined): DrinkCategoryMeta {
  const found = DRINK_CATEGORY_META.find((c) => c.id === id);
  return found ?? DRINK_CATEGORY_META.find((c) => c.id === "other")!;
}

export type EnergyVibe = "sleepy" | "warming_up" | "cozy_buzz" | "fully_brewed" | "espresso_mode";

export function energyVibeLabelKey(vibe: string | null | undefined): string {
  const key = vibe ?? "sleepy";
  if (key === "warming_up") return "drinkTracker.vibes.warmingUp";
  if (key === "cozy_buzz") return "drinkTracker.vibes.cozyBuzz";
  if (key === "fully_brewed") return "drinkTracker.vibes.fullyBrewed";
  if (key === "espresso_mode") return "drinkTracker.vibes.espressoMode";
  return "drinkTracker.vibes.sleepy";
}

export interface DrinkTrackerStats {
  today_count: number;
  week_count: number;
  daily_limit: number | null;
  energy_pct: number;
  energy_vibe: EnergyVibe;
  favorite_category: string | null;
  favorite_count: number;
  top_category_week: string | null;
  top_category_week_count: number;
  today_by_category: Record<string, number>;
  week_by_category: Record<string, number>;
  today_drinks: Array<{
    id: string;
    drink_category: string;
    shop_name: string | null;
    logged_at: string;
  }>;
}
