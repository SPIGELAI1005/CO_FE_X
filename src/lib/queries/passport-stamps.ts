import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import type { PassportStampCategory } from "@/lib/passport-stamps";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";

export interface PassportStamp {
  id: string;
  campaign_id: string;
  redemption_id: string;
  coffee_shop_id: string;
  campaign_title: string;
  reward_type: CampaignRewardType;
  stamp_category: PassportStampCategory;
  stamp_variant: number;
  shop_name: string;
  shop_logo_url: string | null;
  city: string | null;
  country: string | null;
  earned_at: string;
  coffee_shops?: { slug: string; cover_image_url: string | null } | null;
}

export interface PassportStampStats {
  stamps: PassportStamp[];
  totalRewards: number;
  uniqueCafesFromStamps: number;
  citiesDiscovered: number;
  neighborhoods: string[];
}

export function usePassportStamps(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.passportStamps(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE.passport,
    queryFn: async (): Promise<PassportStampStats> => {
      const { data, error } = await supabase
        .from("passport_stamps")
        .select(
          `id, campaign_id, redemption_id, coffee_shop_id, campaign_title, reward_type,
          stamp_category, stamp_variant, shop_name, shop_logo_url, city, country, earned_at,
          coffee_shops(slug, cover_image_url)`,
        )
        .eq("user_id", userId!)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      const stamps = (data ?? []) as PassportStamp[];

      const cafeIds = new Set(stamps.map((s) => s.coffee_shop_id));
      const cities = new Set(stamps.map((s) => s.city?.toLowerCase()).filter(Boolean) as string[]);
      const neighborhoods = [...new Set(stamps.map((s) => s.city).filter(Boolean) as string[])].sort();

      return {
        stamps,
        totalRewards: stamps.length,
        uniqueCafesFromStamps: cafeIds.size,
        citiesDiscovered: cities.size,
        neighborhoods,
      };
    },
  });
}
