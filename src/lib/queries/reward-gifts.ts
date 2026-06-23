import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RewardGiftHistoryItem, RewardGiftPreview } from "@/lib/reward-gifts";

export function useRewardGiftPreview(token: string | undefined) {
  return useQuery({
    queryKey: ["rewardGiftPreview", token ?? ""],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_reward_gift_preview", { _gift_token: token! });
      if (error) throw error;
      return (data ?? null) as RewardGiftPreview | null;
    },
  });
}

export function useRewardGiftHistory() {
  return useQuery({
    queryKey: ["rewardGiftHistory"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_reward_gift_history");
      if (error) throw error;
      const raw = (data ?? {}) as { sent?: RewardGiftHistoryItem[]; received?: RewardGiftHistoryItem[] };
      return {
        sent: raw.sent ?? [],
        received: raw.received ?? [],
      };
    },
  });
}

export function usePendingRewardGift(redemptionId: string | undefined) {
  return useQuery({
    queryKey: ["pendingRewardGift", redemptionId ?? ""],
    enabled: !!redemptionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_gifts")
        .select("id, gift_token, status, message, created_at, recipient_id")
        .eq("redemption_id", redemptionId!)
        .eq("status", "pending")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useResolveExplorerByHandle() {
  return useMutation({
    mutationFn: async (handle: string) => {
      const { data, error } = await supabase.rpc("resolve_explorer_by_handle", { _handle: handle });
      if (error) throw error;
      return data as { id: string; display_name: string | null; handle: string | null } | null;
    },
  });
}

export function useCreateRewardGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { redemptionId: string; recipientId?: string; message?: string }) => {
      const { data, error } = await supabase.rpc("create_reward_gift", {
        _redemption_id: payload.redemptionId,
        _recipient_id: payload.recipientId ?? null,
        _message: payload.message ?? null,
      });
      if (error) throw error;
      return data as {
        gift_id: string;
        gift_token: string;
        campaign_title: string;
        shop_name: string;
      };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rewardGiftHistory"] });
      void qc.invalidateQueries({ queryKey: ["pendingRewardGift"] });
      void qc.invalidateQueries({ queryKey: ["campaign"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["badgeStats"] });
      void qc.invalidateQueries({ queryKey: ["xpEvents"] });
    },
  });
}

export function useAcceptRewardGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_reward_gift", { _gift_token: token });
      if (error) throw error;
      return data as { campaign_id: string; campaign_title: string; shop_name: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rewardGiftPreview"] });
      void qc.invalidateQueries({ queryKey: ["rewardGiftHistory"] });
      void qc.invalidateQueries({ queryKey: ["campaign"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useCancelRewardGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (giftId: string) => {
      const { data, error } = await supabase.rpc("cancel_reward_gift", { _gift_id: giftId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rewardGiftHistory"] });
      void qc.invalidateQueries({ queryKey: ["pendingRewardGift"] });
      void qc.invalidateQueries({ queryKey: ["campaign"] });
    },
  });
}
