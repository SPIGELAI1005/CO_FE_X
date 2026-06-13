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
    <div
      className="rounded-2xl border border-dashed p-10 text-center"
      style={{ borderColor: "var(--border)", background: "white" }}
    >
      {Icon && (
        <Icon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
      )}
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      )}
      {children}
      {actionLabel && actionTo && (
        <Button asChild className="mt-5" size="sm">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
