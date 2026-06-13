import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import cofexLogo from "@/assets/cofex-logo.png";
import { NotificationsBell } from "@/components/app/NotificationsBell";

interface PartnerHeaderProps {
  onSignOut: () => void;
}

export function PartnerHeader({ onSignOut }: PartnerHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
      <nav className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link to="/partner" className="flex min-w-0 items-center gap-2.5 font-medium leading-tight">
          <img src={cofexLogo} alt="CO:FE(X) logo" width={36} height={36} className="h-9 w-9 shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[10px] font-bold tracking-[0.2em] text-[color:var(--cofex-coffee-deep)] sm:text-xs">
              CO:FE(X) · Partner
            </span>
            <span className="text-[10px] text-[color:var(--cofex-black)]/55 sm:text-xs">Host dashboard</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/explore"
            className="hidden items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--cofex-black)]/70 hover:bg-[color:var(--cofex-cream)] sm:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Explorer app
          </Link>
          <NotificationsBell />
          <button
            type="button"
            onClick={onSignOut}
            className="cofex-app-header-signout inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-3 py-2 text-xs font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
