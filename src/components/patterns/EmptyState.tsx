import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CoffeeSteam } from "@/components/app/CofexDecor";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="cofex-app-card cofex-app-card-dashed cofex-empty-state px-8 py-10 sm:px-10">
      {Icon && (
        <div className="cofex-empty-state-icon">
          <Icon className="h-8 w-8 text-[color:var(--cofex-cyan)]" aria-hidden />
          <CoffeeSteam className="absolute -top-2 left-1/2 -translate-x-1/2" />
        </div>
      )}
      <h3 className="mt-4 font-extrabold text-[color:var(--cofex-coffee-deep)]">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[color:var(--cofex-black)]/65">{description}</p>
      )}
      {children}
      {actionLabel && actionTo && (
        <Button asChild className="cofex-onboarding-cta mt-6 rounded-full border-0 text-white shadow-md" size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button className="cofex-onboarding-cta mt-6 rounded-full border-0 text-white shadow-md" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
