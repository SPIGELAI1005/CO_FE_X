import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";

export interface AdminModerationQueue {
  feed_items: ModerationFeedItem[];
  moments: ModerationMoment[];
  reports: ContentReportRow[];
  hidden_count: number;
}

export interface ModerationFeedItem {
  id: string;
  source_type: string;
  caption: string | null;
  image_url: string | null;
  image_path: string | null;
  image_bucket: string | null;
  moderation_status: string;
  published_at: string;
  user_id: string;
  author_name: string | null;
  author_handle: string | null;
  shop_name: string | null;
}

export interface ModerationMoment {
  id: string;
  caption: string | null;
  image_path: string;
  drink_type: string | null;
  moderation_status: string;
  created_at: string;
  user_id: string;
  author_name: string | null;
  shop_name: string | null;
}

export interface ContentReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name: string | null;
}

export interface AdminUserDetail {
  found: boolean;
  profile?: Record<string, unknown>;
  roles?: string[];
  activity?: {
    check_ins_total: number;
    points_total: number;
    rewards_redeemed: number;
    check_ins_30d: number;
    campaigns_joined: number;
    fraud_events_7d: number;
    recent_check_ins: { id: string; created_at: string; shop_name: string; city: string | null }[];
  };
}

export interface AdminCampaignMetric {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  points_reward: number;
  reward_type: string;
  coffee_shop_id: string;
  shop_name: string;
  shop_city: string | null;
  participants: number;
  redemptions: number;
  used_rewards: number;
  approved_proofs: number;
}

function parseModerationQueue(raw: unknown): AdminModerationQueue {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    feed_items: Array.isArray(o.feed_items) ? (o.feed_items as ModerationFeedItem[]) : [],
    moments: Array.isArray(o.moments) ? (o.moments as ModerationMoment[]) : [],
    reports: Array.isArray(o.reports) ? (o.reports as ContentReportRow[]) : [],
    hidden_count: Number(o.hidden_count ?? 0),
  };
}

export function useAdminModerationQueue() {
  return useQuery({
    queryKey: queryKeys.adminModeration(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_moderation_queue");
      if (error) throw error;
      return parseModerationQueue(data);
    },
  });
}

export function useAdminUserDetail(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.adminUserDetail(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_user_detail", { _user_id: userId! });
      if (error) throw error;
      return (data ?? { found: false }) as AdminUserDetail;
    },
  });
}

export function useAdminCampaignMetrics() {
  return useQuery({
    queryKey: queryKeys.adminCampaignMetrics(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_campaign_metrics");
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as AdminCampaignMetric[];
    },
  });
}

export function useAdminModerateFeedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      feedItemId,
      status,
      notes,
    }: {
      feedItemId: string;
      status: "visible" | "hidden" | "removed";
      notes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_moderate_feed_item", {
        _feed_item_id: feedItemId,
        _status: status,
        _notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminModeration() });
      qc.invalidateQueries({ queryKey: ["adminFraudDashboard"] });
    },
  });
}

export function useAdminModerateMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      momentId,
      status,
      notes,
    }: {
      momentId: string;
      status: "visible" | "hidden" | "removed";
      notes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_moderate_moment", {
        _moment_id: momentId,
        _status: status,
        _notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminModeration() });
      qc.invalidateQueries({ queryKey: ["adminFraudDashboard"] });
    },
  });
}

export function useAdminReviewContentReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      adminNotes,
    }: {
      reportId: string;
      status: "reviewed" | "dismissed" | "action_taken";
      adminNotes?: string;
    }) => {
      const { error } = await supabase.rpc("admin_review_content_report", {
        _report_id: reportId,
        _status: status,
        _admin_notes: adminNotes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminModeration() });
      qc.invalidateQueries({ queryKey: ["adminFraudDashboard"] });
    },
  });
}

export function momentImageUrl(path: string) {
  const { data } = supabase.storage.from("explorer-moments").getPublicUrl(path);
  return data.publicUrl;
}

export function feedItemImageUrl(item: ModerationFeedItem) {
  if (item.image_url) return item.image_url;
  if (item.image_path && item.image_bucket) {
    const { data } = supabase.storage.from(item.image_bucket).getPublicUrl(item.image_path);
    return data.publicUrl;
  }
  return null;
}
