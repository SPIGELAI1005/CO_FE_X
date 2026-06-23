import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import { inferRewardType } from "@/lib/map/campaign-markers";
import { queryKeys } from "./keys";

export type SocialSubmissionStatus = "pending" | "approved" | "rejected";

export interface PartnerSocialSubmission {
  id: string;
  user_id: string;
  campaign_id: string;
  coffee_shop_id: string;
  platform: string;
  submission_type: string;
  url: string | null;
  screenshot_path: string | null;
  caption: string | null;
  explorer_note: string | null;
  status: SocialSubmissionStatus;
  created_at: string;
  review_notes: string | null;
  reviewed_by: string | null;
  redemption_code: string | null;
  points_awarded: number | null;
  last_check_in_at: string | null;
  campaigns: {
    title: string;
    hashtag: string | null;
    hashtags: string[] | null;
    points_reward: number;
    reward_type: CampaignRewardType;
    reward_description: string | null;
    status: string;
    ends_at: string | null;
  } | null;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

function checkInKey(userId: string, shopId: string) {
  return `${userId}:${shopId}`;
}

async function fetchPartnerSocialSubmissions(status: SocialSubmissionStatus): Promise<PartnerSocialSubmission[]> {
  const { data, error } = await supabase
    .from("social_submissions")
    .select(
      `id, user_id, campaign_id, coffee_shop_id, platform, submission_type, url, screenshot_path,
      caption, explorer_note, status, created_at, review_notes, redemption_code, points_awarded, reviewed_by,
      campaigns(title, hashtag, hashtags, points_reward, reward_type, reward_description, status, ends_at)`,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as Omit<PartnerSocialSubmission, "last_check_in_at" | "profiles">[];

  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const shopIds = [...new Set(rows.map((r) => r.coffee_shop_id))];

  const [{ data: checkIns }, { data: profiles }] = await Promise.all([
    supabase
      .from("check_ins")
      .select("user_id, coffee_shop_id, created_at")
      .in("user_id", userIds)
      .in("coffee_shop_id", shopIds)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds),
  ]);

  const checkInMap = new Map<string, string>();
  for (const ci of checkIns ?? []) {
    const key = checkInKey(ci.user_id, ci.coffee_shop_id);
    if (!checkInMap.has(key)) checkInMap.set(key, ci.created_at);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((row) => {
    const raw = row.campaigns as Record<string, unknown> | null;
    const campaigns = row.campaigns
      ? {
          ...row.campaigns,
          reward_type: inferRewardType(
            raw?.reward_type as string | null,
            raw?.reward_description as string | null,
          ),
          hashtags: Array.isArray(raw?.hashtags) ? (raw.hashtags as string[]) : null,
        }
      : null;

    return {
      ...row,
      campaigns,
      profiles: profileMap.get(row.user_id) ?? null,
      last_check_in_at: checkInMap.get(checkInKey(row.user_id, row.coffee_shop_id)) ?? null,
    };
  });
}

export async function fetchPartnerSocialSubmissionCounts(): Promise<Record<SocialSubmissionStatus, number>> {
  const { data, error } = await supabase.from("social_submissions").select("status");
  if (error) throw error;
  const counts: Record<SocialSubmissionStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of data ?? []) {
    const status = row.status as SocialSubmissionStatus;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

export function usePartnerSocialSubmissionCounts() {
  return useQuery({
    queryKey: queryKeys.partnerSocialSubmissionCounts,
    queryFn: fetchPartnerSocialSubmissionCounts,
    staleTime: 30_000,
  });
}

export function usePartnerSocialSubmissions(status: SocialSubmissionStatus) {
  return useQuery({
    queryKey: queryKeys.partnerSocialSubmissions(status),
    queryFn: () => fetchPartnerSocialSubmissions(status),
    staleTime: 30_000,
  });
}

export function usePartnerSocialProofSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: ["partnerSocialProofUrls", ...paths.sort()],
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("social-proof").createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      return map;
    },
  });
}

export function useReviewSocialSubmission(status: SocialSubmissionStatus) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      decision,
      notes,
    }: {
      submissionId: string;
      decision: "approved" | "rejected";
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("review_social_submission", {
        _submission_id: submissionId,
        _decision: decision,
        _notes: notes?.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      (["pending", "approved", "rejected"] as const).forEach((s) => {
        qc.invalidateQueries({ queryKey: queryKeys.partnerSocialSubmissions(s) });
      });
      qc.invalidateQueries({ queryKey: queryKeys.partnerSocialSubmissionCounts });
    },
  });
}
