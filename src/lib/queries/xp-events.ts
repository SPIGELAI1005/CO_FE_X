import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE } from "./stale-times";

export interface XpEventRow {
  id: string;
  action_type: string;
  xp_value: number;
  event_at: string;
  metadata: Record<string, unknown> | null;
}

export function useRecentXpEvents(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["xpEvents", userId, limit],
    enabled: !!userId,
    staleTime: STALE.profile,
    queryFn: async (): Promise<XpEventRow[]> => {
      const { data, error } = await supabase
        .from("xp_events")
        .select("id, action_type, xp_value, event_at, metadata")
        .eq("user_id", userId!)
        .order("event_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as XpEventRow[];
    },
  });
}
