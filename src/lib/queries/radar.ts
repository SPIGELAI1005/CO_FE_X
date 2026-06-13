import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";

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
