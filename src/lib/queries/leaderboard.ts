import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";

export type LeaderboardMetric = "points" | "cafes" | "reviews" | "campaigns" | "social";

export interface LeaderboardRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  total_points: number;
  cafes_visited: number;
  reviews_written: number;
  campaigns_completed: number;
  social_posts: number;
  rank: number;
}

export async function fetchLeaderboard(metric: LeaderboardMetric, limit = 50, citySlug?: string | null) {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    _metric: metric,
    _limit: limit,
    _city_slug: citySlug ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export function useLeaderboard(metric: LeaderboardMetric, citySlug?: string | null) {
  return useQuery({
    queryKey: [...queryKeys.leaderboard(metric), citySlug ?? "global"],
    queryFn: () => fetchLeaderboard(metric, 50, citySlug),
    staleTime: STALE.leaderboard,
  });
}

export interface MyLeaderboardRank {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  total_points: number;
  cafes_visited: number;
  reviews_written: number;
  campaigns_completed: number;
  social_posts: number;
  rank: number;
  total_explorers: number;
}

export async function fetchMyLeaderboardRank(metric: LeaderboardMetric, citySlug?: string | null) {
  const { data, error } = await supabase.rpc("get_my_leaderboard_rank", {
    _metric: metric,
    _city_slug: citySlug ?? undefined,
  });
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    user_id: String(row.user_id ?? ""),
    display_name: (row.display_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    total_points: Number(row.total_points ?? 0),
    cafes_visited: Number(row.cafes_visited ?? 0),
    reviews_written: Number(row.reviews_written ?? 0),
    campaigns_completed: Number(row.campaigns_completed ?? 0),
    social_posts: Number(row.social_posts ?? 0),
    rank: Number(row.rank ?? 0),
    total_explorers: Number(row.total_explorers ?? 0),
  } satisfies MyLeaderboardRank;
}

export function useMyLeaderboardRank(metric: LeaderboardMetric, userId?: string, citySlug?: string | null) {
  return useQuery({
    queryKey: [...queryKeys.myLeaderboardRank(metric), citySlug ?? "global"],
    queryFn: () => fetchMyLeaderboardRank(metric, citySlug),
    staleTime: STALE.myLeaderboardRank,
    enabled: !!userId,
  });
}

export function myRankToLeaderboardRow(rank: MyLeaderboardRank): LeaderboardRow {
  return {
    user_id: rank.user_id,
    display_name: rank.display_name,
    avatar_url: rank.avatar_url,
    city: rank.city,
    total_points: rank.total_points,
    cafes_visited: rank.cafes_visited,
    reviews_written: rank.reviews_written,
    campaigns_completed: rank.campaigns_completed,
    social_posts: rank.social_posts,
    rank: rank.rank,
  };
}
