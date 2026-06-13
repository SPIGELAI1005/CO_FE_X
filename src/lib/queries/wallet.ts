import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";
import { afterWalletChange } from "./invalidation";

export interface WalletSummary {
  balance: number;
  referralCode: string | null;
  referredBy: string | null;
  expireDays: string;
  catalog: CatalogItem[];
  redemptions: Redemption[];
  expiring: ExpiringBucket[];
}

export interface LedgerEntry {
  id: string;
  delta: number;
  balance_after: number;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  cost_points: number;
  emoji: string | null;
  tier: string | null;
}

export interface Redemption {
  id: string;
  catalog_id: string;
  points_spent: number;
  redemption_code: string;
  used_at: string | null;
  created_at: string;
}

export interface ExpiringBucket {
  bucket: string;
  expires_at: string;
  amount: number;
}

export function useWallet(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wallet(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE.wallet,
    queryFn: async (): Promise<WalletSummary> => {
      const [{ data: prof }, { data: cat }, { data: red }, { data: buckets }] = await Promise.all([
        supabase
          .from("profiles")
          .select("total_points, referral_code, referred_by, points_expire_days")
          .eq("id", userId!)
          .maybeSingle(),
        supabase.from("reward_catalog").select("*").eq("active", true).order("sort_order"),
        supabase
          .from("catalog_redemptions")
          .select("*")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.rpc("get_expiring_points_buckets"),
      ]);

      return {
        balance: prof?.total_points ?? 0,
        referralCode: prof?.referral_code ?? null,
        referredBy: prof?.referred_by ?? null,
        expireDays: prof?.points_expire_days ? String(prof.points_expire_days) : "off",
        catalog: (cat ?? []) as CatalogItem[],
        redemptions: (red ?? []) as Redemption[],
        expiring: (buckets ?? []) as ExpiringBucket[],
      };
    },
  });
}

export function usePointsLedger(userId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.walletLedger(userId ?? "", from, to),
    enabled: !!userId,
    staleTime: STALE.wallet,
    queryFn: async () => {
      let q = supabase
        .from("points_ledger")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(new Date(to).getTime() + 86400000 - 1).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LedgerEntry[];
    },
  });
}

export function useRedeemCatalogItem(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.rpc("redeem_catalog_item", { _item_id: itemId });
      if (error) throw error;
      return data as { item?: string };
    },
    onSuccess: () => {
      if (userId) afterWalletChange(qc, userId);
    },
  });
}

export function useClaimReferral(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc("claim_referral", { _code: code.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) afterWalletChange(qc, userId);
    },
  });
}

export function useSetPointsExpiration(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: number | null) => {
      const { error } = await supabase.rpc("set_points_expiration_policy", { _days: days });
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) afterWalletChange(qc, userId);
    },
  });
}
