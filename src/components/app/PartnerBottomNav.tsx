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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryItems = [
  { to: "/partner", label: "Home", Icon: LayoutDashboard, exact: true },
  { to: "/partner/campaigns", label: "Campaigns", Icon: Megaphone },
  { to: "/partner/verify", label: "Verify", Icon: Shield },
  { to: "/partner/submissions", label: "Posts", Icon: Share2 },
] as const;

const moreItems = [
  { to: "/partner/shop", label: "Shop profile", Icon: Store },
  { to: "/partner/rewards", label: "Rewards", Icon: Gift },
  { to: "/partner/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/partner/billing", label: "Billing", Icon: CreditCard },
  { to: "/partner/settings", label: "Settings", Icon: Settings },
  { to: "/explore", label: "Explorer app", Icon: ArrowLeft },
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
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}

function MoreNavItem() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = moreItems.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const activeLink = moreItems.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const ActiveIcon = activeLink?.Icon ?? MoreHorizontal;
  const label = activeLink?.label ?? "More";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[9px] font-semibold leading-none transition-colors sm:text-[10px] ${
            active ? "cofex-nav-link-active" : "text-[color:var(--cofex-black)]/45"
          }`}
          aria-label="More partner tools"
        >
          <ActiveIcon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
          <span className="max-w-full truncate px-0.5">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="cofex-rewards-menu mb-2 w-52">
        {moreItems.map(({ to, label, Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex items-center gap-2 cursor-pointer">
              <Icon className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PartnerBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--border)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      aria-label="Partner navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-0.5">
        {primaryItems.map((item) => (
          <NavLink key={item.to} {...item} />
        ))}
        <MoreNavItem />
      </div>
    </nav>
  );
}
