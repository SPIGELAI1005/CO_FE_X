import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";
import type { MomentFeedFilter, MomentFeedItem } from "@/lib/moments";

async function resolveFeedImages(items: MomentFeedItem[]): Promise<MomentFeedItem[]> {
  const privatePaths = items
    .filter((i) => i.image_path && i.image_bucket === "social-proof")
    .map((i) => i.image_path!);

  let signed = new Map<string, string>();
  if (privatePaths.length) {
    const { data } = await supabase.storage.from("social-proof").createSignedUrls(privatePaths, 3600);
    signed = new Map(
      (data ?? [])
        .filter((r) => r.path && r.signedUrl)
        .map((r) => [r.path!, r.signedUrl!]),
    );
  }

  return items.map((item) => {
    if (item.image_path && item.image_bucket === "social-proof") {
      return { ...item, image_url: signed.get(item.image_path) ?? item.image_url };
    }
    if (item.image_path && item.image_bucket === "explorer-moments") {
      const { data } = supabase.storage.from("explorer-moments").getPublicUrl(item.image_path);
      return { ...item, image_url: data.publicUrl };
    }
    return item;
  });
}

export function useMomentsFeed(
  filter: MomentFeedFilter,
  coords: { lat: number; lng: number } | null,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.momentsFeed(filter, coords?.lat, coords?.lng),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_explorer_feed", {
        _filter: filter,
        _latitude: coords?.lat ?? undefined,
        _longitude: coords?.lng ?? undefined,
        _cursor: pageParam ?? undefined,
        _limit: 15,
      });
      if (error) throw error;
      const raw = (data as MomentFeedItem[]) ?? [];
      const items = await resolveFeedImages(raw);
      const nextCursor = items.length ? items[items.length - 1].published_at : null;
      return { items, nextCursor };
    },
    getNextPageParam: (last) => (last.items.length >= 15 ? last.nextCursor : undefined),
  });
}

export function useToggleMomentLike(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedItemId: string) => {
      const { data, error } = await supabase.rpc("toggle_feed_like", { _feed_item_id: feedItemId });
      if (error) throw error;
      return data as { liked: boolean; like_count: number };
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ["momentsFeed"] });
    },
  });
}

export function useToggleMomentSave(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedItemId: string) => {
      const { data, error } = await supabase.rpc("toggle_feed_save", { _feed_item_id: feedItemId });
      if (error) throw error;
      return data as { saved: boolean; save_count: number };
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ["momentsFeed"] });
    },
  });
}

export function usePublishUserMoment(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      file: File;
      coffeeShopId?: string;
      drinkType?: string;
      caption?: string;
    }) => {
      if (!userId) throw new Error("Sign in required");
      if (payload.file.size > 8 * 1024 * 1024) throw new Error("Max 8MB");
      const ext = payload.file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("explorer-moments")
        .upload(path, payload.file, { contentType: payload.file.type });
      if (up.error) throw up.error;
      const { data, error } = await supabase.rpc("publish_user_moment", {
        _image_path: path,
        _coffee_shop_id: payload.coffeeShopId ?? undefined,
        _drink_type: payload.drinkType ?? undefined,
        _caption: payload.caption ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ["momentsFeed"] });
    },
  });
}
