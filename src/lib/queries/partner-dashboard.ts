import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeRewardsRemaining,
  countActiveCampaigns,
  countNewExplorersToday,
  estimateSocialReachToday,
} from "@/lib/partner-dashboard-metrics";

export interface PartnerDashboardOverview {
  activeCampaigns: number;
  pendingSubmissions: number;
  redeemedToday: number;
  newExplorersToday: number;
  socialReachToday: number;
  rewardsRemaining: number;
}

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function usePartnerDashboardOverview(enabled = true) {
  return useQuery({
    queryKey: ["partnerDashboardOverview"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<PartnerDashboardOverview> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          activeCampaigns: 0,
          pendingSubmissions: 0,
          redeemedToday: 0,
          newExplorersToday: 0,
          socialReachToday: 0,
          rewardsRemaining: 0,
        };
      }

      const todayISO = startOfTodayISO();

      const { data: shops } = await supabase.from("coffee_shops").select("id").eq("partner_id", user.id);
      const shopIds = (shops ?? []).map((s) => s.id);
      if (!shopIds.length) {
        return {
          activeCampaigns: 0,
          pendingSubmissions: 0,
          redeemedToday: 0,
          newExplorersToday: 0,
          socialReachToday: 0,
          rewardsRemaining: 0,
        };
      }

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, status, ends_at, max_participants, available_quantity")
        .in("coffee_shop_id", shopIds);

      const cIds = (campaigns ?? []).map((c) => c.id);
      const now = new Date();

      const activeCampaigns = countActiveCampaigns(campaigns ?? [], now);

      const [
        { count: pendingSubmissions },
        { data: redsToday },
        { data: checkInsToday },
        { data: socialToday },
        { data: participants },
      ] = await Promise.all([
        cIds.length
          ? supabase
              .from("social_submissions")
              .select("id", { count: "exact", head: true })
              .in("campaign_id", cIds)
              .eq("status", "pending")
          : Promise.resolve({ count: 0 }),
        cIds.length
          ? supabase
              .from("campaign_redemptions")
              .select("id")
              .in("campaign_id", cIds)
              .not("used_at", "is", null)
              .gte("used_at", todayISO)
          : Promise.resolve({ data: [] as { id: string }[] }),
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", todayISO),
        cIds.length
          ? supabase
              .from("social_submissions")
              .select("platform")
              .in("campaign_id", cIds)
              .eq("status", "approved")
              .gte("created_at", todayISO)
          : Promise.resolve({ data: [] as { platform: string }[] }),
        cIds.length
          ? supabase.from("campaign_participants").select("campaign_id").in("campaign_id", cIds)
          : Promise.resolve({ data: [] as { campaign_id: string }[] }),
      ]);

      const partCount = new Map<string, number>();
      for (const p of participants ?? []) {
        if (!p.campaign_id) continue;
        partCount.set(p.campaign_id, (partCount.get(p.campaign_id) ?? 0) + 1);
      }

      const rewardsRemaining = computeRewardsRemaining(campaigns ?? [], partCount, now);

      const { data: allCheckIns } = await supabase
        .from("check_ins")
        .select("user_id, created_at")
        .in("coffee_shop_id", shopIds);

      const firstVisit = new Map<string, string>();
      for (const r of allCheckIns ?? []) {
        const prev = firstVisit.get(r.user_id);
        if (!prev || r.created_at < prev) firstVisit.set(r.user_id, r.created_at);
      }
      const newExplorersToday = countNewExplorersToday(firstVisit, todayISO);

      const socialReachToday = estimateSocialReachToday((socialToday ?? []).map((r) => r.platform));

      return {
        activeCampaigns,
        pendingSubmissions: pendingSubmissions ?? 0,
        redeemedToday: redsToday?.length ?? 0,
        newExplorersToday,
        socialReachToday,
        rewardsRemaining,
      };
    },
  });
}
