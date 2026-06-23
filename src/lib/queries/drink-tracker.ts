import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DrinkTrackerStats } from "@/lib/drink-categories";

export function useDrinkTracker() {
  return useQuery({
    queryKey: ["drinkTracker"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_drink_tracker");
      if (error) throw error;
      return (data ?? {}) as DrinkTrackerStats;
    },
  });
}

export function useSetDailyDrinkLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (limit: number | null) => {
      const { data, error } = await supabase.rpc("set_daily_drink_limit", { _limit: limit });
      if (error) throw error;
      return data as { daily_drink_limit: number | null };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drinkTracker"] });
    },
  });
}
