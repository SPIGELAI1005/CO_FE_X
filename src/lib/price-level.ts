/** Affordability tier 1–4 stored on `coffee_shops.price_level`. */

export const PRICE_LEVEL_MIN = 1;
export const PRICE_LEVEL_MAX = 4;
export const PRICE_LEVEL_OPTIONS = [1, 2, 3, 4] as const;

/** EU launch default; switch to `neutral` for currency-agnostic tiers. */
export type PriceLevelSymbolStyle = "euro" | "neutral";

export const DEFAULT_PRICE_LEVEL_SYMBOL: PriceLevelSymbolStyle = "euro";

const TIER_CHAR: Record<PriceLevelSymbolStyle, string> = {
  euro: "€",
  neutral: "·",
};

export function formatPriceLevel(
  level: number,
  style: PriceLevelSymbolStyle = DEFAULT_PRICE_LEVEL_SYMBOL,
): string {
  const n = Math.min(PRICE_LEVEL_MAX, Math.max(PRICE_LEVEL_MIN, Math.round(level)));
  return TIER_CHAR[style].repeat(n);
}
