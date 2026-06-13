import { createFileRoute, Link, Outlet, useNavigate, redirect, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { BottomNav } from "@/components/app/BottomNav";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { EmailVerificationBanner } from "@/components/app/EmailVerificationBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSessionGuard } from "@/hooks/use-auth-session";

export const Route = createFileRoute("/_authenticated/_explorer")({
  beforeLoad: async ({ location }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const onOnboarding = location.pathname === "/onboarding";

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return;

    const completed = !!profile?.onboarding_completed_at;

    if (!completed && !onOnboarding) {
      throw redirect({ to: "/onboarding" });
    }
    if (completed && onOnboarding) {
      throw redirect({ to: "/explore" });
    }
  },
  component: ExplorerLayout,
});

function ExplorerLayout() {
  const navigate = useNavigate();
  useAuthSessionGuard();
  const onOnboarding = useRouterState({ select: (s) => s.location.pathname === "/onboarding" });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-white pb-20" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/95 backdrop-blur px-5 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <Link to="/explore" className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
          CO:FE(X)
        </Link>
        <div className="flex items-center gap-1">
          {!onOnboarding && <NotificationsBell />}
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>
      {!onOnboarding && <EmailVerificationBanner />}
      <main>
        <Outlet />
      </main>
      {!onOnboarding && <BottomNav />}
    </div>
  );
}
