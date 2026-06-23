import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import type { RewardIconMeta } from "@/lib/reward-icons";

type IconTileMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

interface EmptyStateProps {
  icon?: LucideIcon;
  iconMeta?: IconTileMeta;
  rewardType?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  iconMeta,
  rewardType,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  children,
}: EmptyStateProps) {
  const hasIcon = rewardType || iconMeta || Icon;

  return (
    <div className="cofex-app-card cofex-app-card-dashed cofex-empty-state px-8 py-10 sm:px-10">
      {hasIcon && (
        <div className="mx-auto w-fit">
          {rewardType ? (
            <CofexIconTile rewardType={rewardType} size="xl" />
          ) : iconMeta ? (
            <CofexIconTile meta={iconMeta} size="xl" />
          ) : Icon ? (
            <CofexIconTile meta={{ Icon, from: "from-cyan-400", to: "to-teal-600" }} size="xl" />
          ) : null}
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
