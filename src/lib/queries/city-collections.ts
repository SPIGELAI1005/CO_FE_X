import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { STALE } from "./stale-times";

export interface CityCollectionProgress {
  found: boolean;
  city_slug: string;
  city_name: string;
  country: string | null;
  shops_target: number;
  badge_slug: string | null;
  visited: number;
  pct: number;
  complete: boolean;
  next_shop: { id: string; slug: string; name: string } | null;
}

export interface UserCityCollection {
  city_slug: string;
  city_name: string;
  country: string | null;
  shops_target: number;
  badge_slug: string | null;
  visited: number;
  pct: number;
  complete: boolean;
}

function parseCityProgress(data: unknown): CityCollectionProgress | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.found === false) return null;
  const next = row.next_shop;
  return {
    found: true,
    city_slug: String(row.city_slug ?? ""),
    city_name: String(row.city_name ?? ""),
    country: (row.country as string | null) ?? null,
    shops_target: Number(row.shops_target ?? 5),
    badge_slug: (row.badge_slug as string | null) ?? null,
    visited: Number(row.visited ?? 0),
    pct: Number(row.pct ?? 0),
    complete: Boolean(row.complete),
    next_shop:
      next && typeof next === "object" && "slug" in (next as object)
        ? {
            id: String((next as Record<string, unknown>).id ?? ""),
            slug: String((next as Record<string, unknown>).slug ?? ""),
            name: String((next as Record<string, unknown>).name ?? ""),
          }
        : null,
  };
}

export async function fetchCityCollectionProgress(citySlug: string) {
  const { data, error } = await supabase.rpc("get_city_collection_progress", {
    _city_slug: citySlug,
  });
  if (error) throw error;
  return parseCityProgress(data);
}

export function useCityCollectionProgress(citySlug: string | undefined, userId?: string) {
  return useQuery({
    queryKey: queryKeys.cityCollection(citySlug ?? ""),
    queryFn: () => fetchCityCollectionProgress(citySlug!),
    enabled: !!userId && !!citySlug,
    staleTime: STALE.cityCollection,
  });
}

export async function fetchUserCityCollections() {
  const { data, error } = await supabase.rpc("get_user_city_collections");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as UserCityCollection[];
}

export function useUserCityCollections(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userCityCollections(userId ?? ""),
    queryFn: fetchUserCityCollections,
    enabled: !!userId,
    staleTime: STALE.cityCollection,
  });
}
