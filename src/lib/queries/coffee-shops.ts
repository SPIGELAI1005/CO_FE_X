import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";
import { optimizeImageUrl } from "@/lib/images";
import { cityFromSlug } from "@/lib/cities";

export interface CoffeeShopRow {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  rating: number;
  rating_count: number;
  tags: string[];
  amenities: string[];
  free_coffee_available: boolean;
}

export interface CoffeeShopDetail extends CoffeeShopRow {
  description: string | null;
  address: string | null;
  country: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  price_level: number;
  origin_region?: string | null;
  roaster_name?: string | null;
  fair_trade?: boolean | null;
  co2_note?: string | null;
  soundscape_url?: string | null;
}

async function fetchApprovedCoffeeShop(slug: string) {
  const { data, error } = await supabase
    .from("coffee_shops")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  return data as CoffeeShopDetail | null;
}

export function approvedCoffeeShopQuery(slug: string) {
  return queryOptions({
    queryKey: queryKeys.coffeeShop(slug),
    queryFn: () => fetchApprovedCoffeeShop(slug),
    staleTime: STALE.coffeeShop,
  });
}

export function useCoffeeShopBySlug(slug: string) {
  return useQuery(approvedCoffeeShopQuery(slug));
}

export function useShopActiveCampaigns(shopId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.coffeeShops(), "campaigns", shopId],
    enabled: !!shopId,
    staleTime: STALE.campaigns,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, reward_description")
        .eq("coffee_shop_id", shopId!)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCoffeeShops() {
  return useQuery({
    queryKey: queryKeys.coffeeShops(),
    staleTime: STALE.coffeeShops,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shops")
        .select(
          "id, slug, name, city, latitude, longitude, cover_image_url, rating, rating_count, tags, amenities, free_coffee_available",
        )
        .eq("status", "approved");
      if (error) throw error;
      return (data ?? []) as CoffeeShopRow[];
    },
  });
}

export function useCoffeeShopsByCity(citySlug: string) {
  const cityName = cityFromSlug(citySlug);
  return useQuery({
    queryKey: [...queryKeys.coffeeShops(), "city", citySlug],
    staleTime: STALE.coffeeShops,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shops")
        .select(
          "id, slug, name, city, latitude, longitude, cover_image_url, rating, rating_count, tags, amenities, free_coffee_available",
        )
        .eq("status", "approved")
        .ilike("city", cityName);
      if (error) throw error;
      return (data ?? []) as CoffeeShopRow[];
    },
  });
}

export function useCityActiveCampaigns(citySlug: string, shopIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.coffeeShops(), "cityCampaigns", citySlug],
    enabled: shopIds.length > 0,
    staleTime: STALE.campaigns,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, reward_description, hashtag, coffee_shop_id, coffee_shops(name, slug)")
        .eq("status", "active")
        .in("coffee_shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function coffeeShopOgImage(shop: CoffeeShopDetail | null | undefined) {
  return optimizeImageUrl(shop?.cover_image_url, { width: 1200, quality: 85 }) ?? undefined;
}

export function useCoffeeShopCampaignCounts(shopIds: string[]) {
  return useQuery({
    queryKey: [...queryKeys.coffeeShops(), "campaignCounts", shopIds],
    enabled: shopIds.length > 0,
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("coffee_shop_id")
        .eq("status", "active")
        .in("coffee_shop_id", shopIds);

      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("coffee_shop_id, user_id")
        .in("coffee_shop_id", shopIds);

      const counts: Record<string, { campaigns: number; popularity: number }> = {};
      for (const id of shopIds) counts[id] = { campaigns: 0, popularity: 0 };
      for (const c of campaigns ?? []) {
        if (c.coffee_shop_id) counts[c.coffee_shop_id].campaigns++;
      }
      const seen: Record<string, Set<string>> = {};
      for (const ci of checkIns ?? []) {
        if (!ci.coffee_shop_id) continue;
        (seen[ci.coffee_shop_id] ||= new Set()).add(ci.user_id);
      }
      for (const [id, users] of Object.entries(seen)) {
        counts[id].popularity = users.size;
      }
      return counts;
    },
  });
}
