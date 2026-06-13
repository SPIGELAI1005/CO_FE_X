import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { afterCampaignAction } from "./invalidation";

export interface CampaignListItem {
  id: string;
  title: string;
  description: string | null;
  reward_description: string | null;
  requirements: string | null;
  hashtag: string | null;
  points_reward: number;
  max_participants: number | null;
  campaign_type: string;
  ends_at: string | null;
  cover_image_url: string | null;
  coffee_shops: {
    name: string;
    slug: string;
    city: string | null;
    cover_image_url: string | null;
  } | null;
  participant_count: number;
}

export interface CampaignDetail {
  id: string;
  title: string;
  description: string | null;
  reward_description: string | null;
  requirements: string | null;
  hashtag: string | null;
  points_reward: number;
  max_participants: number | null;
  required_check_ins: number;
  campaign_type: string;
  status: string;
  ends_at: string | null;
  coffee_shop_id: string;
  cover_image_url: string | null;
  coffee_shops: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    cover_image_url: string | null;
  } | null;
}

export interface CampaignUserState {
  participantCount: number;
  joined: boolean;
  myCheckIns: number;
  redemption: {
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    points_awarded: number;
  } | null;
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: queryKeys.activeCampaigns(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, title, description, reward_description, requirements, hashtag, points_reward, max_participants, campaign_type, ends_at, cover_image_url, coffee_shops(name, slug, city, cover_image_url)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Omit<CampaignListItem, "participant_count">[];
      if (!rows.length) return [] as CampaignListItem[];

      const ids = rows.map((r) => r.id);
      const { data: participants } = await supabase
        .from("campaign_participants")
        .select("campaign_id")
        .in("campaign_id", ids);

      const counts = new Map<string, number>();
      for (const p of participants ?? []) {
        counts.set(p.campaign_id, (counts.get(p.campaign_id) ?? 0) + 1);
      }

      return rows.map((r) => ({
        ...r,
        participant_count: counts.get(r.id) ?? 0,
      })) as CampaignListItem[];
    },
  });
}

export function useCampaignDetail(campaignId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId),
    queryFn: async (): Promise<{ campaign: CampaignDetail | null; user: CampaignUserState }> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, title, description, reward_description, requirements, hashtag, points_reward, max_participants, required_check_ins, campaign_type, status, ends_at, coffee_shop_id, cover_image_url, coffee_shops(id, name, slug, city, cover_image_url)",
        )
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { campaign: null, user: emptyUserState() };

      const campaign = data as unknown as CampaignDetail;
      const [{ count: pcount }, { data: mine }, { count: ci }, { data: red }] = await Promise.all([
        supabase
          .from("campaign_participants")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId),
        userId
          ? supabase
              .from("campaign_participants")
              .select("id")
              .eq("campaign_id", campaignId)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        userId
          ? supabase
              .from("check_ins")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("coffee_shop_id", campaign.coffee_shop_id)
          : Promise.resolve({ count: 0 }),
        userId
          ? supabase
              .from("campaign_redemptions")
              .select("redemption_code, redeemed_at, used_at, points_awarded")
              .eq("campaign_id", campaignId)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        campaign,
        user: {
          participantCount: pcount ?? 0,
          joined: !!mine,
          myCheckIns: ci ?? 0,
          redemption: red,
        },
      };
    },
  });
}

function emptyUserState(): CampaignUserState {
  return { participantCount: 0, joined: false, myCheckIns: 0, redemption: null };
}

export function useJoinCampaign(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.rpc("join_campaign", { _campaign_id: campaignId });
      if (error) throw error;
    },
    onSuccess: (_data, campaignId) => {
      if (userId) afterCampaignAction(qc, userId, campaignId);
    },
  });
}

export function useRedeemCampaign(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.rpc("redeem_campaign", { _campaign_id: campaignId });
      if (error) throw error;
      return data as { points_awarded?: number };
    },
    onSuccess: (_data, campaignId) => {
      if (userId) afterCampaignAction(qc, userId, campaignId);
    },
  });
}
