import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LEGAL_LINK_GROUPS } from "@/components/marketing/LegalPageShell";
import { AppPageSection } from "@/components/app/AppPageShell";

export function AppLegalLinks() {
  return (
    <AppPageSection title="Legal & policies">
      <div className="cofex-app-card grid gap-6 p-5 sm:grid-cols-2">
        {LEGAL_LINK_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">
              {group.title}
            </h3>
            <ul className="mt-3 space-y-0.5">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="-mx-2 flex items-center justify-between gap-2 rounded-xl px-2 py-2.5 text-sm text-[color:var(--cofex-black)]/75 transition hover:bg-[color:var(--cofex-pastel-gray)] hover:text-[color:var(--cofex-coffee-deep)]"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-35" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-[color:var(--cofex-black)]/45">
        © {new Date().getFullYear()} CO:FE(X)
      </p>
    </AppPageSection>
  );
}
