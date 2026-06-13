import Stripe from "stripe";

export type StripeCheckoutPlan = "pro" | "campaign_boost";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY on the server.");
  }
  return new Stripe(key);
}

export function getStripePriceId(plan: StripeCheckoutPlan): string {
  const priceId =
    plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_CAMPAIGN_BOOST;
  if (!priceId) {
    throw new Error(`Missing Stripe price for plan "${plan}".`);
  }
  return priceId;
}

export function planFromStripePrice(priceId: string | null | undefined): "pro" | "campaign_boost" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_CAMPAIGN_BOOST) return "campaign_boost";
  return null;
}

export function monthlyPriceCents(plan: "pro" | "campaign_boost" | "listing"): number {
  if (plan === "pro") return 7900;
  if (plan === "campaign_boost") return 2900;
  return 0;
}

export function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.VITE_APP_URL ??
    (process.env.NODE_ENV === "production" ? "https://cofex.app" : "http://localhost:3000")
  );
}
