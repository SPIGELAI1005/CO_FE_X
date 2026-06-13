import { createFileRoute, Outlet, useNavigate, redirect, useRouterState } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";
import { BottomNav } from "@/components/app/BottomNav";
import { EmailVerificationBanner } from "@/components/app/EmailVerificationBanner";
import { MarketingFooter, MarketingNav } from "@/components/marketing/LegalPageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSessionGuard } from "@/hooks/use-auth-session";
import { LogOut } from "lucide-react";

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
    <div
      className={`flex min-h-screen flex-col ${onOnboarding ? "bg-[color:var(--cofex-cream)]" : "pb-20"}`}
      style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}
    >
      {onOnboarding ? (
        <MarketingNav
          trailing={
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-4 py-2 text-sm hover:bg-[color:var(--cofex-black)] hover:text-white transition"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          }
        />
      ) : (
        <AppHeader onSignOut={signOut} />
      )}
      {!onOnboarding && <EmailVerificationBanner />}
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      {onOnboarding ? <MarketingFooter /> : <BottomNav />}
    </div>
  );
}
