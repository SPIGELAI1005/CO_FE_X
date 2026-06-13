import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import type { ShopPlan } from "@/lib/billing/plans";
import { limitsForPlan } from "@/lib/billing/plans";

export interface ShopSubscription {
  coffee_shop_id: string;
  plan: ShopPlan;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  coffee_shops: { id: string; name: string; slug: string } | null;
}

export interface PartnerBillingSummary {
  shops: ShopSubscription[];
  hasProPlan: boolean;
  totalShops: number;
  activeCampaignCounts: Record<string, number>;
}

export function usePartnerBilling(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerBilling(userId ?? ""),
    enabled: !!userId,
    queryFn: async (): Promise<PartnerBillingSummary> => {
      const { data: shops, error } = await supabase
        .from("coffee_shops")
        .select("id, name, slug")
        .eq("partner_id", userId!);
      if (error) throw error;

      const shopIds = (shops ?? []).map((s) => s.id);
      if (!shopIds.length) {
        return { shops: [], hasProPlan: false, totalShops: 0, activeCampaignCounts: {} };
      }

      const [{ data: subs }, { data: campaigns }] = await Promise.all([
        supabase
          .from("shop_subscriptions")
          .select("coffee_shop_id, plan, status, current_period_end, stripe_customer_id, stripe_subscription_id")
          .in("coffee_shop_id", shopIds),
        supabase
          .from("campaigns")
          .select("coffee_shop_id, status, ends_at")
          .in("coffee_shop_id", shopIds)
          .eq("status", "active"),
      ]);

      const subMap = new Map((subs ?? []).map((s) => [s.coffee_shop_id, s]));
      const activeCampaignCounts: Record<string, number> = {};
      const now = Date.now();
      for (const c of campaigns ?? []) {
        if (c.ends_at && new Date(c.ends_at).getTime() <= now) continue;
        activeCampaignCounts[c.coffee_shop_id] = (activeCampaignCounts[c.coffee_shop_id] ?? 0) + 1;
      }

      const merged: ShopSubscription[] = (shops ?? []).map((shop) => {
        const sub = subMap.get(shop.id);
        const plan = (sub?.plan as ShopPlan | undefined) ?? "listing";
        return {
          coffee_shop_id: shop.id,
          plan,
          status: sub?.status ?? "trialing",
          current_period_end: sub?.current_period_end ?? null,
          stripe_customer_id: sub?.stripe_customer_id ?? null,
          stripe_subscription_id: sub?.stripe_subscription_id ?? null,
          coffee_shops: shop,
        };
      });

      const hasProPlan = merged.some(
        (s) => s.plan === "pro" && (s.status === "active" || s.status === "trialing"),
      );

      return {
        shops: merged,
        hasProPlan,
        totalShops: merged.length,
        activeCampaignCounts,
      };
    },
  });
}

export function billingLimitsForShop(
  summary: PartnerBillingSummary | undefined,
  shopId: string,
) {
  const shop = summary?.shops.find((s) => s.coffee_shop_id === shopId);
  const plan = shop?.plan ?? "listing";
  const limits = limitsForPlan(plan);
  const activeCampaigns = summary?.activeCampaignCounts[shopId] ?? 0;
  return {
    plan,
    limits,
    activeCampaigns,
    canAddCampaign:
      limits.maxActiveCampaigns === null || activeCampaigns < limits.maxActiveCampaigns,
    canAddShop: summary?.hasProPlan || (summary?.totalShops ?? 0) < (limitsForPlan("listing").maxShops ?? 1),
  };
}
