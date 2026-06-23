import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";

export interface PartnerShop {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
  country: string | null;
}

const ACTIVE_SHOP_KEY = "partner-active-shop-id";

export function getStoredPartnerShopId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_SHOP_KEY);
}

export function setStoredPartnerShopId(shopId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_SHOP_KEY, shopId);
}

export function usePartnerShops(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerShops(userId ?? ""),
    enabled: !!userId,
    queryFn: async (): Promise<PartnerShop[]> => {
      const { data, error } = await supabase
        .from("coffee_shops")
        .select("id, name, slug, status, city, country")
        .eq("partner_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PartnerShop[];
    },
  });
}

export function usePartnerVerifyAudit(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerVerifyAudit(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redemption_verifications")
        .select("id, code, result, verified_at, campaign_id")
        .eq("partner_id", userId!)
        .order("verified_at", { ascending: false })
        .limit(25);
      if (error) throw error;

      const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("redemption_verifications")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", userId!)
        .gte("verified_at", sinceHour);

      return { rows: data ?? [], remaining: Math.max(0, 60 - (count ?? 0)) };
    },
  });
}

import { parseVerifyInput } from "@/lib/parse-verify-code";

export function useVerifyRedemptionCode(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: string) => {
      const parsed = parseVerifyInput(raw);
      if (!parsed) throw new Error("Invalid code format");
      const { data, error } = await supabase.rpc("verify_redemption_code", {
        _code: parsed.code,
        _ip: undefined,
        _rotating_token: parsed.rotatingToken ?? undefined,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.partnerVerifyAudit(userId) });
    },
  });
}

export function usePartnerApiKeys(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerApiKeys(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, scopes, rate_limit_per_minute, created_at, revoked_at, last_used_at")
        .eq("partner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePartnerReferrals(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerReferrals(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_referrals")
        .select("*")
        .eq("referrer_partner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePartnerReferralCode(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerReferralCode(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("referral_code").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data?.referral_code ?? null;
    },
  });
}

export function useSetCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: "active" | "paused" | "ended" }) => {
      const { data, error } = await supabase.rpc("partner_set_campaign_status", {
        _campaign_id: campaignId,
        _status: status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnerCampaigns"] });
    },
  });
}

export function useUpdatePartnerCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, patch }: { campaignId: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("partner_update_campaign", {
        _campaign_id: campaignId,
        _patch: patch,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnerCampaigns"] });
    },
  });
}

export function useDuplicatePartnerCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.rpc("partner_duplicate_campaign", {
        _campaign_id: campaignId,
      });
      if (error) throw error;
      return data as { id: string; title: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnerCampaigns"] });
      qc.invalidateQueries({ queryKey: ["partnerDashboardOverview"] });
    },
  });
}

export function useDeletePartnerShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shopId: string) => {
      const { data, error } = await supabase.rpc("partner_delete_shop", { _shop_id: shopId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnerShops"] });
    },
  });
}
