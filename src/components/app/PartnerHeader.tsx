import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import cofexLogo from "@/assets/cofex-logo.png";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { LanguageToggle } from "@/components/app/LanguageToggle";

interface PartnerHeaderProps {
  onSignOut: () => void;
}

export function PartnerHeader({ onSignOut }: PartnerHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="cofex-safe-top sticky top-0 z-40 border-b border-[color:var(--border)] bg-white/90 backdrop-blur">
      <nav className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <Link to="/partner" className="flex min-w-0 items-center gap-2 font-medium leading-tight sm:gap-2.5">
          <img src={cofexLogo} alt="CO:FE(X) logo" width={36} height={36} className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[10px] font-bold tracking-[0.15em] text-[color:var(--cofex-coffee-deep)] sm:text-xs sm:tracking-[0.2em]">
              {t("header.partnerBrand")}
            </span>
            <span className="hidden truncate text-[10px] text-[color:var(--cofex-black)]/55 sm:block sm:text-xs">{t("header.partnerTagline")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <Link
            to="/explore"
            className="hidden items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--cofex-black)]/70 hover:bg-[color:var(--cofex-cream)] sm:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("header.explorerApp")}
          </Link>
          <LanguageToggle />
          <NotificationsBell />
          <button
            type="button"
            onClick={onSignOut}
            className="cofex-app-header-signout inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-3 py-2 text-xs font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("header.signOut")}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
