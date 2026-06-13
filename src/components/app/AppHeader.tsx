import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import cofexLogo from "@/assets/cofex-logo.png";
import { NotificationsBell } from "@/components/app/NotificationsBell";

interface AppHeaderProps {
  onSignOut: () => void;
}

export function AppHeader({ onSignOut }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:py-4">
        <Link to="/explore" className="flex min-w-0 items-center gap-3 font-medium leading-tight">
          <img
            src={cofexLogo}
            alt="CO:FE(X) logo"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[10px] tracking-[0.12em] sm:text-sm md:tracking-[0.2em]">
              CO:FE(X) // Coffee Explorer Network
            </span>
            <span className="text-[10px] tracking-[0.12em] opacity-70 sm:text-xs">Explore. Share. Earn.</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationsBell />
          <button
            type="button"
            onClick={onSignOut}
            className="cofex-app-header-signout inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
