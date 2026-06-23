import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";

export interface PassportBadge {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown> | null;
  rarity: string;
  category: string;
}

export interface PassportCheckIn {
  id: string;
  created_at: string;
  coffee_shop_id: string;
  coffee_shops: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    cover_image_url: string | null;
    logo_url: string | null;
    tags: string[] | null;
  } | null;
}

export interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

export interface PassportData {
  profile: {
    display_name: string | null;
    total_points: number;
    total_check_ins: number;
    total_rewards_redeemed: number;
    avatar_url: string | null;
  } | null;
  badges: PassportBadge[];
  earnedBadgeIds: Set<string>;
  earnedBadges: EarnedBadge[];
  checkIns: PassportCheckIn[];
}

export function usePassport(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.passport(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE.passport,
    queryFn: async (): Promise<PassportData> => {
      const [{ data: bs }, { data: ubs }, { data: cis }, { data: prof }] = await Promise.all([
        supabase.from("badges").select("id, slug, name, description, criteria, rarity, category"),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId!).order("earned_at", { ascending: false }),
        supabase
          .from("check_ins")
          .select(
            "id, created_at, coffee_shop_id, coffee_shops(id, name, slug, city, country, cover_image_url, logo_url, tags)",
          )
          .eq("user_id", userId!)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("display_name, total_points, total_check_ins, total_rewards_redeemed, avatar_url")
          .eq("id", userId!)
          .single(),
      ]);

      return {
        profile: prof,
        badges: (bs ?? []) as PassportBadge[],
        earnedBadgeIds: new Set((ubs ?? []).map((r) => r.badge_id)),
        earnedBadges: (ubs ?? []) as EarnedBadge[],
        checkIns: (cis ?? []) as PassportCheckIn[],
      };
    },
  });
}
