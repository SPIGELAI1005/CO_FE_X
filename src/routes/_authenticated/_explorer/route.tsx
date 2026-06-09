import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { BottomNav } from "@/components/app/BottomNav";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_explorer")({
  component: ExplorerLayout,
});

function ExplorerLayout() {
  const navigate = useNavigate();
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
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
