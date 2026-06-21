import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import { afterReview } from "./invalidation";

export interface ShopReview {
  id: string;
  rating: number;
  body: string | null;
  media_urls?: string[] | null;
  created_at: string;
  user_id: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export function useShopReviews(shopId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shopReviews(shopId ?? ""),
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, media_urls, created_at, user_id, profiles(display_name, avatar_url)")
        .eq("coffee_shop_id", shopId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ShopReview[];
    },
  });
}

export function useMyReview(shopId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myReview(shopId ?? "", userId ?? ""),
    enabled: !!shopId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, media_urls, created_at")
        .eq("coffee_shop_id", shopId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      shopId: string;
      userId: string;
      rating: number;
      body: string;
      mediaUrls?: string[];
      existingId?: string;
    }) => {
      const row = {
        coffee_shop_id: payload.shopId,
        user_id: payload.userId,
        rating: payload.rating,
        body: payload.body.trim() || null,
        media_urls: payload.mediaUrls ?? [],
      };
      if (payload.existingId) {
        const { error } = await supabase.from("reviews").update(row).eq("id", payload.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      afterReview(qc, vars.userId, vars.shopId);
    },
  });
}

export function reviewStats(reviews: ShopReview[]) {
  if (!reviews.length) return { average: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return { average: sum / reviews.length, count: reviews.length };
}
