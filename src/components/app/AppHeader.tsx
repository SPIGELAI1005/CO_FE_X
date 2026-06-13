import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import cofexLogo from "@/assets/cofex-logo.png";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { LanguageToggle } from "@/components/app/LanguageToggle";

interface AppHeaderProps {
  onSignOut: () => void;
}

export function AppHeader({ onSignOut }: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="cofex-safe-top sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-4">
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
              {t("header.brandLine")}
            </span>
            <span className="hidden truncate text-[10px] tracking-[0.12em] opacity-70 sm:block sm:text-xs">{t("header.tagline")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <NotificationsBell />
          <button
            type="button"
            onClick={onSignOut}
            className="cofex-app-header-signout inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("header.signOut")}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
