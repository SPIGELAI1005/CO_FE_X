import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Megaphone,
  Shield,
  Share2,
  MoreHorizontal,
  Store,
  Gift,
  BarChart3,
  CreditCard,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryItemKeys = [
  { to: "/partner", labelKey: "nav.home", Icon: LayoutDashboard, exact: true },
  { to: "/partner/campaigns", labelKey: "partnerNav.campaigns", Icon: Megaphone },
  { to: "/partner/verify", labelKey: "nav.verify", Icon: Shield },
  { to: "/partner/submissions", labelKey: "nav.posts", Icon: Share2 },
] as const;

const moreItemKeys = [
  { to: "/partner/shop", labelKey: "partnerNav.shop", Icon: Store },
  { to: "/partner/rewards", labelKey: "partnerNav.rewards", Icon: Gift },
  { to: "/partner/analytics", labelKey: "partnerNav.analytics", Icon: BarChart3 },
  { to: "/partner/billing", labelKey: "partnerNav.billing", Icon: CreditCard },
  { to: "/partner/settings", labelKey: "partnerNav.settings", Icon: Settings },
  { to: "/explore", labelKey: "header.explorerApp", Icon: ArrowLeft },
] as const;

function NavLink({
  to,
  label,
  Icon,
  exact,
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
        active ? "cofex-nav-link-active" : "text-[color:var(--cofex-black)]/45"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
      <span className={`max-w-full truncate px-0.5 ${active ? "" : "max-[359px]:sr-only"}`}>{label}</span>
    </Link>
  );
}

function MoreNavItem() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = moreItemKeys.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const activeLink = moreItemKeys.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const ActiveIcon = activeLink?.Icon ?? MoreHorizontal;
  const label = activeLink ? t(activeLink.labelKey) : t("nav.more");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
            active ? "cofex-nav-link-active" : "text-[color:var(--cofex-black)]/45"
          }`}
          aria-label={t("partnerNav.moreMenuAria")}
        >
          <ActiveIcon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
          <span className={`max-w-full truncate px-0.5 ${active ? "" : "max-[359px]:sr-only"}`}>{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="cofex-rewards-menu mb-2 w-52">
        {moreItemKeys.map(({ to, labelKey, Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex cursor-pointer items-center gap-2">
              <Icon className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
              {t(labelKey)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PartnerBottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      aria-label={t("partnerNav.title")}
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-0.5">
        {primaryItemKeys.map((item) => (
          <NavLink key={item.to} {...item} label={t(item.labelKey)} />
        ))}
        <MoreNavItem />
      </div>
    </nav>
  );
}
