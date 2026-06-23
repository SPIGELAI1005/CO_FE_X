import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./keys";

export interface CrawlStop {
  order: number;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  hint: string | null;
  latitude?: number | null;
  longitude?: number | null;
  campaign_id?: string | null;
  campaign_title?: string | null;
  neighborhood?: string | null;
  done?: boolean;
}

export interface CoffeeCrawl {
  id: string;
  slug: string;
  title: string;
  city_slug: string;
  description: string | null;
  reward_points: number;
  stop_count: number;
  stops: CrawlStop[];
  theme?: string | null;
  estimated_walk_minutes?: number;
  estimated_distance_m?: number;
  badge_slug?: string | null;
  badge_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  progress_mode?: string;
  seasonal?: boolean;
  joined?: boolean;
  completed?: boolean;
  stops_done?: number;
}

export interface CrawlProgress {
  crawl_id: string;
  slug: string;
  title: string;
  completed: boolean;
  joined: boolean;
  stops_done: number;
  stop_count: number;
}

export function useTrailDetail(slug: string) {
  return useQuery({
    queryKey: ["trailDetail", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trail_detail", { _slug: slug });
      if (error) throw error;
      return data as CoffeeCrawl | null;
    },
  });
}

export function useJoinTrail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data, error } = await supabase.rpc("join_trail", { _slug: slug });
      if (error) throw error;
      return data as { joined: boolean; slug: string; title: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coffeeCrawls"] });
      qc.invalidateQueries({ queryKey: ["crawlProgress"] });
      qc.invalidateQueries({ queryKey: ["trailDetail"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCoffeeCrawls(citySlug?: string) {
  return useQuery({
    queryKey: ["coffeeCrawls", citySlug ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_coffee_crawls", {
        _city_slug: citySlug ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CoffeeCrawl[];
    },
  });
}

export function useCrawlProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["crawlProgress", userId ?? ""],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_crawl_progress");
      if (error) throw error;
      return (data ?? []) as CrawlProgress[];
    },
  });
}

export function useBeveragePassport(userId: string | undefined) {
  return useQuery({
    queryKey: ["beveragePassport", userId ?? ""],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_beverage_passport");
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
  });
}

export function useActiveSpawns(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ["activeSpawns", lat, lng],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_spawns", {
        _lat: lat ?? null,
        _lng: lng ?? null,
        _radius_km: 5,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        shop_id: string;
        shop_name: string;
        shop_slug: string;
        rarity: string;
        bonus_points: number;
        title: string;
        ends_at: string;
      }>;
    },
    staleTime: 60_000,
  });
}

export function useShopMayor(shopId: string | undefined) {
  return useQuery({
    queryKey: ["shopMayor", shopId ?? ""],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shop_mayor", { _shop_id: shopId! });
      if (error) throw error;
      return data as { display_name: string; check_ins: number } | null;
    },
  });
}

export function useShopStories(shopId: string | undefined) {
  return useQuery({
    queryKey: ["shopStories", shopId ?? ""],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_shop_stories", { _shop_id: shopId! });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; media_url: string; caption: string | null; expires_at: string }>;
    },
  });
}

export function usePartnerArrivals(shopId?: string) {
  return useQuery({
    queryKey: ["partnerArrivals", shopId ?? "all"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_arrivals", {
        _shop_id: shopId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        shop_name: string;
        explorer_name: string;
        eta_minutes: number;
        message: string | null;
        created_at: string;
      }>;
    },
    refetchInterval: 30_000,
  });
}

export function useAnnounceArrival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { shopId: string; etaMinutes?: number; message?: string }) => {
      const { data, error } = await supabase.rpc("announce_shop_arrival", {
        _shop_id: payload.shopId,
        _eta_minutes: payload.etaMinutes ?? 5,
        _message: payload.message ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partnerArrivals"] }),
  });
}

export function useCreateCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("create_crew", { _name: name });
      if (error) throw error;
      return data as { id: string; name: string; invite_code: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myCrew"] }),
  });
}

export function useJoinCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("join_crew", { _invite_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myCrew"] }),
  });
}

export function useSendGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { recipientId: string; message?: string }) => {
      const { data, error } = await supabase.rpc("send_gift_credit", {
        _recipient_id: payload.recipientId,
        _message: payload.message ?? null,
      });
      if (error) throw error;
      return data as { gift_id: string; code: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSetMapTheme(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (theme: string) => {
      const { data, error } = await supabase.rpc("set_map_theme", { _theme: theme });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}

export function useHealthLog() {
  return useQuery({
    queryKey: ["healthLog"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_today_health_log");
      if (error) throw error;
      return data as { steps: number | null; caffeine_mg: number | null; log_date: string } | null;
    },
  });
}

export function useUpsertHealthLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { steps?: number; caffeineMg?: number }) => {
      const { data, error } = await supabase.rpc("upsert_health_log", {
        _steps: payload.steps ?? null,
        _caffeine_mg: payload.caffeineMg ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["healthLog"] }),
  });
}

export function useSavePushSubscription() {
  return useMutation({
    mutationFn: async (subscription: PushSubscriptionJSON) => {
      const { data, error } = await supabase.rpc("save_push_subscription", {
        _subscription: subscription as unknown as Record<string, unknown>,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useActivePhotoChallenge() {
  return useQuery({
    queryKey: ["photoChallenge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_challenge_defs")
        .select("id, theme, reward_points, ends_at")
        .eq("active", true)
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 300_000,
  });
}
