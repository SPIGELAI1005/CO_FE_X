import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseRpcErrorMessage } from "@/lib/rpc/client";
import { queryKeys } from "./keys";
import { afterCampaignAction } from "./invalidation";
import type { CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";
import { parseSocialRequirements, type CampaignSocialRequirements } from "@/lib/campaign-fulfillment";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import { DEFAULT_CAMPAIGN_SLOGAN } from "@/lib/domain/campaign-reward-model";
import { inferRewardType } from "@/lib/map/campaign-markers";

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
  fulfillment_mode: CampaignFulfillmentMode;
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
  slogan: string;
  description: string | null;
  reward_description: string | null;
  reward_type: CampaignRewardType;
  requirements: string | null;
  hashtag: string | null;
  hashtags: string[];
  points_reward: number;
  max_participants: number | null;
  available_quantity: number | null;
  required_check_ins: number;
  campaign_type: string;
  fulfillment_mode: CampaignFulfillmentMode;
  social_requirements: CampaignSocialRequirements;
  participation_token: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  terms_and_conditions: string | null;
  gifting_enabled?: boolean;
  coffee_shop_id: string;
  cover_image_url: string | null;
  coffee_shops: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    address: string | null;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    logo_url: string | null;
    cover_image_url: string | null;
    social_links?: { instagram?: string; tiktok?: string; facebook?: string; website?: string } | null;
  } | null;
}

export interface SocialSubmissionSummary {
  id: string;
  platform: string;
  status: "pending" | "approved" | "rejected";
  url: string | null;
  review_notes: string | null;
  redemption_code: string | null;
  points_awarded: number | null;
  created_at: string;
}

export interface CampaignUserState {
  participantCount: number;
  joined: boolean;
  myCheckIns: number;
  redemption: {
    id?: string;
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    points_awarded: number;
    expires_at: string | null;
    reward_status: string;
  } | null;
  socialSubmissions: SocialSubmissionSummary[];
  latestSocialStatus: "none" | "pending" | "approved" | "rejected";
}

export function useActiveCampaigns() {
  return useQuery({
    queryKey: queryKeys.activeCampaigns(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, title, description, reward_description, requirements, hashtag, points_reward, max_participants, campaign_type, fulfillment_mode, ends_at, cover_image_url, coffee_shops(name, slug, city, cover_image_url)",
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
        fulfillment_mode: (r.fulfillment_mode ?? "check_in") as CampaignFulfillmentMode,
        participant_count: counts.get(r.id) ?? 0,
      })) as CampaignListItem[];
    },
  });
}

function latestSocialStatus(subs: SocialSubmissionSummary[]): CampaignUserState["latestSocialStatus"] {
  if (!subs.length) return "none";
  const latest = subs[0];
  return latest.status;
}

export function useCampaignDetail(campaignId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId),
    refetchInterval: (query) => {
      const redemption = query.state.data?.user?.redemption;
      if (redemption && !redemption.used_at) return 5000;
      const campaign = query.state.data?.campaign;
      const joined = query.state.data?.user?.joined;
      if (campaign && !joined && campaign.ends_at) return 30_000;
      return false;
    },
    queryFn: async (): Promise<{ campaign: CampaignDetail | null; user: CampaignUserState }> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `id, title, slogan, description, reward_description, reward_type, requirements, hashtag, hashtags,
          points_reward, max_participants, available_quantity, required_check_ins, campaign_type, fulfillment_mode,
          social_requirements, participation_token, status, starts_at, ends_at, terms_and_conditions, gifting_enabled, coffee_shop_id, cover_image_url,
          coffee_shops(id, name, slug, city, address, description, latitude, longitude, logo_url, cover_image_url, social_links)`,
        )
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { campaign: null, user: emptyUserState() };

      const raw = data as Record<string, unknown>;
      const campaign: CampaignDetail = {
        ...(data as unknown as CampaignDetail),
        slogan: String(raw.slogan ?? DEFAULT_CAMPAIGN_SLOGAN),
        reward_type: inferRewardType(
          raw.reward_type as string | null,
          raw.reward_description as string | null,
        ),
        hashtags: Array.isArray(raw.hashtags)
          ? (raw.hashtags as string[])
          : raw.hashtag
            ? [String(raw.hashtag)]
            : [],
        available_quantity:
          raw.available_quantity != null ? Number(raw.available_quantity) : null,
        terms_and_conditions: (raw.terms_and_conditions as string | null) ?? null,
        gifting_enabled: raw.gifting_enabled !== false,
        fulfillment_mode: (raw.fulfillment_mode as CampaignFulfillmentMode) ?? "check_in",
        social_requirements: parseSocialRequirements(raw.social_requirements),
        participation_token: (raw.participation_token as string | null) ?? null,
      };

      const [{ count: pcount }, { data: mine }, { count: ci }, { data: red }, { data: subs }] =
        await Promise.all([
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
                .select("id, redemption_code, redeemed_at, used_at, points_awarded, expires_at, reward_status")
                .eq("campaign_id", campaignId)
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          userId
            ? supabase
                .from("social_submissions")
                .select(
                  "id, platform, status, url, review_notes, redemption_code, points_awarded, created_at",
                )
                .eq("campaign_id", campaignId)
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] }),
        ]);

      const socialSubmissions = (subs ?? []) as SocialSubmissionSummary[];
      const approvedSub = socialSubmissions.find((s) => s.status === "approved" && s.redemption_code);

      const redemption =
        red ??
        (approvedSub
          ? {
              redemption_code: approvedSub.redemption_code!,
              redeemed_at: approvedSub.created_at,
              used_at: null,
              points_awarded: approvedSub.points_awarded ?? campaign.points_reward,
              expires_at: null,
              reward_status: "unlocked",
            }
          : null);

      return {
        campaign,
        user: {
          participantCount: pcount ?? 0,
          joined: !!mine,
          myCheckIns: ci ?? 0,
          redemption,
          socialSubmissions,
          latestSocialStatus: latestSocialStatus(socialSubmissions),
        },
      };
    },
  });
}

function emptyUserState(): CampaignUserState {
  return {
    participantCount: 0,
    joined: false,
    myCheckIns: 0,
    redemption: null,
    socialSubmissions: [],
    latestSocialStatus: "none",
  };
}

export function useJoinCampaign(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      source,
      termsAccepted = false,
      disclosureAcknowledged = false,
    }: {
      campaignId: string;
      source?: string;
      termsAccepted?: boolean;
      disclosureAcknowledged?: boolean;
    }) => {
      const { error } = await supabase.rpc("join_campaign", {
        _campaign_id: campaignId,
        _join_source: source ?? null,
        _terms_accepted: termsAccepted,
        _disclosure_acknowledged: disclosureAcknowledged,
      });
      if (error) throw new Error(parseRpcErrorMessage(error));
    },
    onSuccess: (_data, { campaignId }) => {
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
      return data as { points_awarded?: number; redemption_code?: string };
    },
    onSuccess: (_data, campaignId) => {
      if (userId) afterCampaignAction(qc, userId, campaignId);
    },
  });
}
