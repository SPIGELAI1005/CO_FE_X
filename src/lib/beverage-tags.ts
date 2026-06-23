import type { LucideIcon } from "lucide-react";
import { Citrus, Coffee, CupSoda, IceCreamCone, Leaf } from "lucide-react";

export interface BeverageTag {
  id: string;
  labelKey: string;
}

export const BEVERAGE_ICON_MAP: Record<string, { Icon: LucideIcon; from: string; to: string }> = {
  coffee: { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  matcha: { Icon: Leaf, from: "from-emerald-400", to: "to-green-700" },
  ice_cream: { Icon: IceCreamCone, from: "from-pink-400", to: "to-rose-500" },
  cola: { Icon: CupSoda, from: "from-red-400", to: "to-rose-700" },
  juice: { Icon: Citrus, from: "from-lime-400", to: "to-green-600" },
};

export function beverageIconMeta(id: string) {
  return BEVERAGE_ICON_MAP[id] ?? BEVERAGE_ICON_MAP.coffee;
}

export const BEVERAGE_TAGS: BeverageTag[] = [
  { id: "coffee", labelKey: "beverage.coffee" },
  { id: "matcha", labelKey: "beverage.matcha" },
  { id: "ice_cream", labelKey: "beverage.iceCream" },
  { id: "cola", labelKey: "beverage.cola" },
  { id: "juice", labelKey: "beverage.juice" },
];

export function beverageTitle(count: number, tag: string): string {
  const titles: Record<string, string[]> = {
    coffee: ["Coffee Explorer", "Espresso Hunter", "Cappuccino Master"],
    matcha: ["Matcha Curious", "Matcha Seeker", "Master of Matcha"],
    matcha_default: ["Matcha Curious", "Matcha Seeker", "Master of Matcha"],
    ice_cream: ["Sweet Starter", "Scoop Collector", "Frozen Legend"],
    cola: ["Fizz Fan", "Cola Cruiser", "Soda Legend"],
    juice: ["Fresh Sipper", "Juice Journey", "Citrus Legend"],
  };
  const list = titles[tag] ?? titles.coffee;
  if (count >= 20) return list[2];
  if (count >= 5) return list[1];
  return list[0];
}
