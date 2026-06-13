import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code")) {
        for (let i = 0; i < 40; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) break;
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
