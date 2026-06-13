import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Megaphone, BookOpen, Wallet, User, RadioTower, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/radar", label: "Radar", Icon: RadioTower },
  { to: "/explore", label: "Explore", Icon: Map },
  { to: "/campaigns", label: "Campaigns", Icon: Megaphone },
] as const;

const rewardsLinks = [
  { to: "/passport", label: "Passport", Icon: BookOpen },
  { to: "/wallet", label: "Wallet", Icon: Wallet },
] as const;

function NavLink({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: typeof Map;
}) {
  return (
    <Link
      to={to}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-medium leading-none text-muted-foreground transition-colors sm:text-[10px]"
      activeProps={{ style: { color: "var(--cofex-coffee-deep)" } }}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  );
}

function RewardsNavItem() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onPassport = pathname.startsWith("/passport");
  const onWallet = pathname.startsWith("/wallet");
  const active = onPassport || onWallet;
  const ActiveIcon = onWallet ? Wallet : BookOpen;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-medium leading-none text-muted-foreground transition-colors sm:text-[10px]"
          style={{ color: active ? "var(--cofex-coffee-deep)" : undefined }}
          aria-label="Passport and wallet"
        >
          <span className="relative">
            <ActiveIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
            <ChevronUp className="absolute -right-2 -top-1 h-2.5 w-2.5 opacity-60" />
          </span>
          <span className="max-w-full truncate px-0.5">{onWallet ? "Wallet" : onPassport ? "Passport" : "Rewards"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" className="mb-2 min-w-[10rem]">
        {rewardsLinks.map(({ to, label, Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex cursor-pointer items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      style={{ borderColor: "var(--border)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1 sm:px-2">
        {navItems.map(({ to, label, Icon }) => (
          <li key={to} className="flex min-w-0 flex-1">
            <NavLink to={to} label={label} Icon={Icon} />
          </li>
        ))}
        <li className="flex min-w-0 flex-1">
          <RewardsNavItem />
        </li>
        <li className="flex min-w-0 flex-1">
          <NavLink to="/profile" label="Profile" Icon={User} />
        </li>
      </ul>
    </nav>
  );
}
