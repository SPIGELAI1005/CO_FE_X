import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type SideNavItem = { to: string; label: string; Icon: LucideIcon };

export function SideNav({
  title,
  items,
  footerItems,
}: {
  title: string;
  items: SideNavItem[];
  footerItems?: SideNavItem[];
}) {
  return (
    <aside
      className="cofex-partner-sidebar hidden md:flex md:w-60 md:flex-col md:border-r md:sticky md:top-0 md:h-screen md:px-4 md:py-6"
      style={{ borderColor: "var(--border)", background: "linear-gradient(180deg, #fff 0%, var(--cofex-cream) 100%)" }}
    >
      <div className="mb-6 text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--cofex-cyan)]">
        {title}
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="cofex-partner-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--cofex-black)]/55 transition-colors hover:bg-[color:var(--cofex-pastel-blue)]/40 hover:text-[color:var(--cofex-coffee-deep)]"
            activeOptions={{ exact: to === "/partner" }}
            activeProps={{
              className:
                "cofex-partner-nav-link cofex-partner-nav-link-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      {footerItems && footerItems.length > 0 && (
        <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--border)" }}>
          {footerItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[color:var(--cofex-black)]/45 hover:text-[color:var(--cofex-coffee-deep)]"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
