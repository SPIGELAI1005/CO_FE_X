import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
    <div className="cofex-app-card cofex-app-card-dashed px-10 py-10 text-center">
      {Icon && (
        <Icon className="mx-auto h-10 w-10 text-[color:var(--cofex-cyan)]" aria-hidden />
      )}
      <h3 className="mt-3 font-extrabold text-[color:var(--cofex-coffee-deep)]">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-[color:var(--cofex-black)]/65">{description}</p>
      )}
      {children}
      {actionLabel && actionTo && (
        <Button asChild className="mt-5 rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]" size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button className="mt-5 rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
