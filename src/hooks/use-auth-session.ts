import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Redirects to /auth when the session ends; preserves intended path in ?next= */
export function useAuthSessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        const next = window.location.pathname + window.location.search;
        navigate({
          to: "/auth",
          search: next !== "/auth" ? { next } : {},
          replace: true,
        });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);
}
