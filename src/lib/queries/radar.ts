import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";
import type { ChallengeClaimRecord } from "@/lib/explorer-challenges";
import { challengesFromDefs, type ExplorerChallengeDefRow } from "@/lib/explorer-challenges";
import { afterChallengeClaim } from "./invalidation";

export interface RadarShop {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  cover_image_url: string | null;
  tags: string[];
  rating: number;
  distance_km?: number | null;
  recent_visits?: number;
}

export interface RadarCampaign {
  id: string;
  title: string;
  reward_description: string | null;
  points_reward: number;
  cover_image_url: string | null;
  hashtag: string | null;
  campaign_type: string;
  ends_at: string | null;
  shop_id: string;
  shop_slug: string;
  shop_name: string;
  shop_city: string | null;
  participants: number;
}

export interface RadarStats {
  total_check_ins: number;
  total_points: number;
  visits_this_week: number;
  new_shops_this_week: number;
  unique_shops: number;
  cities_explored: number;
  active_campaigns: number;
  streak_days: number;
  week_period_key?: string;
}

export interface CoffeeRadar {
  free_today: RadarShop[];
  trending_matcha: RadarShop[];
  new_campaigns: RadarCampaign[];
  stats: RadarStats;
  generated_at: string;
  radius_km: number;
}

export const DEFAULT_RADAR_CENTER: [number, number] = [38.7139, -9.1394];

export async function fetchCoffeeRadar(center: [number, number] | null, radiusKm = 5) {
  const { data, error } = await supabase.rpc("get_coffee_radar", {
    _lat: center?.[0] ?? null,
    _lng: center?.[1] ?? null,
    _radius_km: radiusKm,
  });
  if (error) throw error;
  return data as CoffeeRadar;
}

export function useCoffeeRadar(center: [number, number] | null) {
  const effectiveCenter = center ?? DEFAULT_RADAR_CENTER;
  return useQuery({
    queryKey: queryKeys.coffeeRadar(effectiveCenter[0], effectiveCenter[1]),
    queryFn: () => fetchCoffeeRadar(center),
    staleTime: STALE.radar,
  });
}

export async function fetchChallengeClaims(userId: string): Promise<{
  claims: ChallengeClaimRecord[];
  weekPeriodKey: string;
}> {
  const [{ data: claims, error: claimsError }, { data: weekKey, error: weekError }] = await Promise.all([
    supabase
      .from("user_challenge_claims")
      .select("challenge_id, period_key, claimed_at, points_awarded")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false }),
    supabase.rpc("get_challenge_week_period_key"),
  ]);
  if (claimsError) throw claimsError;
  if (weekError) throw weekError;
  return {
    claims: (claims ?? []) as ChallengeClaimRecord[],
    weekPeriodKey: String(weekKey ?? ""),
  };
}

export function useChallengeClaims(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.challengeClaims(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE.challengeClaims,
    queryFn: () => fetchChallengeClaims(userId!),
  });
}

export interface ClaimChallengeResult {
  challenge_id: string;
  period_key: string;
  points_awarded: number;
  total_points: number;
}

export function useClaimChallenge(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { data, error } = await supabase.rpc("claim_explorer_challenge", {
        _challenge_id: challengeId,
      });
      if (error) throw error;
      const row = data as Record<string, unknown>;
      return {
        challenge_id: String(row.challenge_id ?? challengeId),
        period_key: String(row.period_key ?? ""),
        points_awarded: Number(row.points_awarded ?? 0),
        total_points: Number(row.total_points ?? 0),
      } satisfies ClaimChallengeResult;
    },
    onSuccess: () => {
      if (userId) afterChallengeClaim(qc, userId);
    },
  });
}

export async function fetchExplorerChallengeDefs() {
  const { data, error } = await supabase
    .from("explorer_challenge_defs")
    .select("id, title, subtitle, stat_key, target, reward, period_type, sort_order, starts_at, ends_at, campaign_tag")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ExplorerChallengeDefRow[];
}

export function useExplorerChallengeDefs() {
  return useQuery({
    queryKey: queryKeys.explorerChallengeDefs(),
    queryFn: fetchExplorerChallengeDefs,
    staleTime: STALE.explorerChallengeDefs,
    select: (rows) => challengesFromDefs(rows),
  });
}
