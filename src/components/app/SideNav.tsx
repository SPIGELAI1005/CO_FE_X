import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type SideNavItem = { to: string; label: string; Icon: LucideIcon };

export function SideNav({ title, items }: { title: string; items: SideNavItem[] }) {
  return (
    <aside
      className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-white md:px-4 md:py-6 md:sticky md:top-0 md:h-screen"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="mb-6 text-xs font-bold tracking-[0.2em] uppercase"
        style={{ color: "var(--cofex-coffee-deep)" }}
      >
        {title}
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{
              style: {
                background: "var(--cofex-cream-warm)",
                color: "var(--cofex-coffee-deep)",
              },
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
