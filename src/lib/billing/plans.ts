export type ShopPlan = "listing" | "campaign_boost" | "pro";

export interface PlanLimits {
  maxShops: number | null;
  maxActiveCampaigns: number | null;
  analyticsExport: boolean;
  promotedDiscover: boolean;
}

export const PLAN_LIMITS: Record<ShopPlan, PlanLimits> = {
  listing: {
    maxShops: 1,
    maxActiveCampaigns: 1,
    analyticsExport: false,
    promotedDiscover: false,
  },
  campaign_boost: {
    maxShops: 1,
    maxActiveCampaigns: 5,
    analyticsExport: false,
    promotedDiscover: false,
  },
  pro: {
    maxShops: null,
    maxActiveCampaigns: null,
    analyticsExport: true,
    promotedDiscover: true,
  },
};

export const PLAN_CATALOG: {
  id: ShopPlan;
  name: string;
  priceLabel: string;
  description: string;
  highlights: string[];
  stripePlan?: "pro" | "campaign_boost";
}[] = [
  {
    id: "listing",
    name: "Listing",
    priceLabel: "Free",
    description: "Get on the map with one location and one active EEFFOC campaign.",
    highlights: ["1 café listing", "1 active campaign", "Basic analytics"],
  },
  {
    id: "campaign_boost",
    name: "Campaign Boost",
    priceLabel: "€29/mo",
    description: "Run more EEFFOC drops without upgrading your full stack.",
    highlights: ["1 café listing", "Up to 5 active campaigns", "Priority support"],
    stripePlan: "campaign_boost",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "€79/mo",
    description: "Multi-location brands, unlimited campaigns and promoted discover.",
    highlights: [
      "Unlimited listings",
      "Unlimited campaigns",
      "Analytics export",
      "Promoted discover slot",
    ],
    stripePlan: "pro",
  },
];

export function limitsForPlan(plan: ShopPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.listing;
}

export function isPaidPlan(plan: ShopPlan): boolean {
  return plan !== "listing";
}

export function canCreateShop(partnerShopCount: number, hasProPlan: boolean): boolean {
  if (hasProPlan) return true;
  return partnerShopCount < (PLAN_LIMITS.listing.maxShops ?? 1);
}

export function canCreateActiveCampaign(activeCount: number, plan: ShopPlan): boolean {
  const max = limitsForPlan(plan).maxActiveCampaigns;
  if (max === null) return true;
  return activeCount < max;
}
