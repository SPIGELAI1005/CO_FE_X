import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

export type PassportStampCategory =
  | "coffee"
  | "matcha"
  | "ice_cream"
  | "juice"
  | "seasonal"
  | "hidden_gem"
  | "local_hero";

export const PASSPORT_STAMP_CATEGORIES: PassportStampCategory[] = [
  "coffee",
  "matcha",
  "ice_cream",
  "juice",
  "seasonal",
  "hidden_gem",
  "local_hero",
];

export const STAMP_CATEGORY_LABEL_KEYS: Record<PassportStampCategory, string> = {
  coffee: "passportPage.categories.coffee",
  matcha: "passportPage.categories.matcha",
  ice_cream: "passportPage.categories.iceCream",
  juice: "passportPage.categories.juice",
  seasonal: "passportPage.categories.seasonal",
  hidden_gem: "passportPage.categories.hiddenGems",
  local_hero: "passportPage.categories.localHeroes",
};

const STAMP_VARIANT_BORDERS = [
  "border-double border-amber-500/80",
  "border-dashed border-[color:var(--cofex-cyan)]/70",
  "border-4 border-[color:var(--cofex-accent-gold)]/60",
  "border-dotted border-emerald-600/70",
  "border-2 border-violet-500/60",
  "border-[3px] border-rose-400/70",
] as const;

const STAMP_VARIANT_ROTATIONS = [-2.5, 1.5, -1, 2, -1.5, 0.5] as const;

const CATEGORY_GRADIENTS: Record<PassportStampCategory, string> = {
  coffee: "from-amber-100 via-orange-50 to-amber-200/80",
  matcha: "from-emerald-100 via-green-50 to-lime-100",
  ice_cream: "from-pink-100 via-rose-50 to-fuchsia-100",
  juice: "from-orange-100 via-yellow-50 to-amber-100",
  seasonal: "from-violet-100 via-purple-50 to-indigo-100",
  hidden_gem: "from-slate-100 via-zinc-50 to-amber-50",
  local_hero: "from-sky-100 via-cyan-50 to-blue-100",
};

export function stampVariantStyle(variant: number) {
  const idx = Math.max(0, Math.min(5, variant - 1));
  return {
    border: STAMP_VARIANT_BORDERS[idx],
    rotate: STAMP_VARIANT_ROTATIONS[idx],
    gradient: CATEGORY_GRADIENTS.coffee,
  };
}

export function stampCategoryGradient(category: PassportStampCategory) {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.coffee;
}

export function rewardTypeToStampCategory(rewardType: CampaignRewardType): PassportStampCategory {
  if (rewardType === "matcha") return "matcha";
  if (rewardType === "ice_cream") return "ice_cream";
  if (rewardType === "juice" || rewardType === "cola") return "juice";
  return "coffee";
}

export function computeFavoriteRewardType(
  stamps: { reward_type: string }[],
): CampaignRewardType | null {
  if (!stamps.length) return null;
  const counts = new Map<string, number>();
  for (const s of stamps) {
    counts.set(s.reward_type, (counts.get(s.reward_type) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [type, n] of counts) {
    if (n > max) {
      max = n;
      best = type;
    }
  }
  return (best as CampaignRewardType) ?? null;
}

export function buildPassportShareSummary(input: {
  explorerName: string;
  stampCount: number;
  cafeCount: number;
  cityCount: number;
  rewardCount: number;
  favoriteRewardLabel?: string | null;
  locale?: string;
}): string {
  const lines = [
    `☕ ${input.explorerName}'s CO:FE(X) Coffee Passport`,
    "",
    `🏪 ${input.cafeCount} cafés visited`,
    `🎁 ${input.rewardCount} rewards collected`,
    `🗺️ ${input.cityCount} cities discovered`,
    input.favoriteRewardLabel ? `✨ Favorite reward: ${input.favoriteRewardLabel}` : null,
    `📮 ${input.stampCount} collectible stamps`,
    "",
    "Join the Coffee Explorer Network, We give EEFFOC!",
  ].filter(Boolean);
  return lines.join("\n");
}
