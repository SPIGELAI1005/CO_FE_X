import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Map as MapIcon, Megaphone, BookOpen, Wallet, User, RadioTower, ChevronUp, Trophy, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItemKeys = [
  { to: "/radar", labelKey: "nav.radar", Icon: RadioTower },
  { to: "/explore", labelKey: "nav.explore", Icon: MapIcon },
  { to: "/campaigns", labelKey: "nav.campaigns", Icon: Megaphone },
] as const;

const rewardsLinkKeys = [
  { to: "/passport", labelKey: "nav.passport", Icon: BookOpen },
  { to: "/crawls", labelKey: "nav.crawls", Icon: Compass },
  { to: "/leaderboard", labelKey: "nav.rank", Icon: Trophy },
  { to: "/wallet", labelKey: "nav.wallet", Icon: Wallet },
] as const;

function NavLink({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || pathname.startsWith(`${to}/`);

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

function rewardsActiveState(pathname: string, rewardsLabel: string) {
  const onPassport = pathname.startsWith("/passport");
  const onCrawls = pathname.startsWith("/crawls");
  const onWallet = pathname.startsWith("/wallet");
  const onRank = pathname.startsWith("/leaderboard");
  const active = onPassport || onCrawls || onWallet || onRank;
  const activeLink = rewardsLinkKeys.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const ActiveIcon = activeLink?.Icon ?? BookOpen;
  const labelKey = activeLink?.labelKey ?? null;
  return { active, ActiveIcon, labelKey, rewardsLabel };
}

function RewardsNavItem() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rewardsLabel = t("nav.rewards");
  const { active, ActiveIcon, labelKey } = rewardsActiveState(pathname, rewardsLabel);
  const label = labelKey ? t(labelKey) : rewardsLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
            active ? "cofex-nav-link-active" : "text-[color:var(--cofex-black)]/45"
          }`}
          aria-label={t("nav.rewardsMenuAria")}
        >
          <span className="relative">
            <ActiveIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            <ChevronUp className="absolute -right-2 -top-1 h-2.5 w-2.5 opacity-60" />
          </span>
          <span className={`max-w-full truncate px-0.5 ${active ? "" : "max-[359px]:sr-only"}`}>{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={12}
        className="cofex-rewards-menu z-[1200] mb-1 min-w-[11rem] rounded-2xl border-[color:var(--border)] bg-white p-1.5 shadow-[var(--shadow-premium)]"
      >
        {rewardsLinkKeys.map(({ to, labelKey, Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link
              to={to}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 font-medium transition hover:bg-[color:var(--cofex-pastel-blue)]"
            >
              <Icon className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
              {t(labelKey)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <nav className="cofex-bottom-nav fixed inset-x-0 bottom-0 z-[100] border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1 pt-1 sm:px-2">
        {navItemKeys.map(({ to, labelKey, Icon }) => (
          <li key={to} className="flex min-w-0 flex-1">
            <NavLink to={to} label={t(labelKey)} Icon={Icon} />
          </li>
        ))}
        <li className="flex min-w-0 flex-1">
          <RewardsNavItem />
        </li>
        <li className="flex min-w-0 flex-1">
          <Link
            to="/profile"
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
              profileActive ? "cofex-nav-link-active" : "text-[color:var(--cofex-black)]/45"
            }`}
          >
            <User className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
            <span className={`max-w-full truncate px-0.5 ${profileActive ? "" : "max-[359px]:sr-only"}`}>
              {t("nav.profile")}
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
