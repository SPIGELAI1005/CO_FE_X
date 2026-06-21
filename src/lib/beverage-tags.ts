export interface BeverageTag {
  id: string;
  labelKey: string;
  emoji: string;
}

export const BEVERAGE_TAGS: BeverageTag[] = [
  { id: "coffee", labelKey: "beverage.coffee", emoji: "☕" },
  { id: "matcha", labelKey: "beverage.matcha", emoji: "🍵" },
  { id: "ice_cream", labelKey: "beverage.iceCream", emoji: "🍦" },
  { id: "cola", labelKey: "beverage.cola", emoji: "🥤" },
  { id: "juice", labelKey: "beverage.juice", emoji: "🧃" },
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
