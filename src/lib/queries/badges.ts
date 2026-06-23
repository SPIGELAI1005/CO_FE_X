import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_BADGE_STATS, type ExplorerBadgeStats } from "@/lib/badges";
import { STALE } from "./stale-times";

function parseBadgeStats(raw: unknown): ExplorerBadgeStats {
  if (!raw || typeof raw !== "object") return EMPTY_BADGE_STATS;
  const o = raw as Record<string, unknown>;
  return {
    campaigns_completed: Number(o.campaigns_completed ?? 0),
    reward_type_counts: (o.reward_type_counts as Record<string, number>) ?? {},
    unique_local_shops: Number(o.unique_local_shops ?? 0),
    low_discovery_visits: Number(o.low_discovery_visits ?? 0),
    social_posts: Number(o.social_posts ?? 0),
    gifts_sent: Number(o.gifts_sent ?? 0),
    sunday_campaigns: Number(o.sunday_campaigns ?? 0),
    rainy_campaigns: Number(o.rainy_campaigns ?? 0),
    allach_campaigns: Number(o.allach_campaigns ?? 0),
    munich_districts: Number(o.munich_districts ?? 0),
    early_bird_campaigns: Number(o.early_bird_campaigns ?? 0),
    night_owl_campaigns: Number(o.night_owl_campaigns ?? 0),
    total_check_ins: Number(o.total_check_ins ?? 0),
    unique_shops: Number(o.unique_shops ?? 0),
    tag_counts: (o.tag_counts as Record<string, number>) ?? {},
    city_counts: (o.city_counts as Record<string, number>) ?? {},
    countries_visited: Array.isArray(o.countries_visited)
      ? (o.countries_visited as string[])
      : [],
  };
}

export function useBadgeStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["badgeStats", userId],
    enabled: !!userId,
    staleTime: STALE.passport,
    queryFn: async (): Promise<ExplorerBadgeStats> => {
      const { data, error } = await supabase.rpc("get_explorer_badge_stats", {
        _user: userId!,
      });
      if (error) throw error;
      return parseBadgeStats(data);
    },
  });
}
