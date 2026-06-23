import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Polls the server TOTP window token shown alongside static backup codes. */
export function useRotatingVerifyToken(code: string) {
  return useQuery({
    queryKey: ["rotating-verify", code],
    enabled: !!code,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rotating_verify_token", { _code: code });
      if (error) throw error;
      return String(data ?? "");
    },
    refetchInterval: 1000,
    staleTime: 0,
  });
}
