import { Link } from "@tanstack/react-router";
import { Map, Megaphone, BookOpen, Wallet, User } from "lucide-react";

const items = [
  { to: "/explore", label: "Explore", Icon: Map },
  { to: "/campaigns", label: "Campaigns", Icon: Megaphone },
  { to: "/passport", label: "Passport", Icon: BookOpen },
  { to: "/wallet", label: "Wallet", Icon: Wallet },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      style={{ borderColor: "var(--border)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ style: { color: "var(--cofex-coffee-deep)" } }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
