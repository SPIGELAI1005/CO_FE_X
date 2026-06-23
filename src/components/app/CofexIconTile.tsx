import type { ReactNode } from "react";
import { resolveRewardIconMeta, type RewardIconMeta } from "@/lib/reward-icons";

export type CofexIconTileSize = "xs" | "sm" | "md" | "lg" | "xl";

type IconTileMeta = Pick<RewardIconMeta, "Icon" | "from" | "to">;

const SIZE_STYLES: Record<CofexIconTileSize, { box: string; icon: string; rounded: string }> = {
  xs: { box: "h-6 w-6", icon: "h-3 w-3", rounded: "rounded-md" },
  sm: { box: "h-8 w-8", icon: "h-3.5 w-3.5", rounded: "rounded-lg" },
  md: { box: "h-12 w-12", icon: "h-5 w-5", rounded: "rounded-xl" },
  lg: { box: "h-14 w-14", icon: "h-6 w-6", rounded: "rounded-2xl" },
  xl: { box: "h-20 w-20", icon: "h-9 w-9", rounded: "rounded-2xl" },
};

interface CofexIconTileProps {
  /** Reward / drink type id (coffee, matcha, espresso, …). */
  rewardType?: string;
  /** Direct icon override (explorer level, badges, filters). */
  meta?: IconTileMeta;
  size?: CofexIconTileSize;
  className?: string;
}

export function CofexIconTile({ rewardType, meta, size = "md", className = "" }: CofexIconTileProps) {
  const resolved = meta ?? resolveRewardIconMeta(rewardType ?? "other");
  const s = SIZE_STYLES[size];
  const Icon = resolved.Icon;

  return (
    <span
      className={`inline-grid shrink-0 place-items-center bg-gradient-to-br shadow-md ${resolved.from} ${resolved.to} ${s.box} ${s.rounded} ${className}`}
      aria-hidden
    >
      <Icon className={`${s.icon} text-white drop-shadow-sm`} strokeWidth={2.25} />
    </span>
  );
}

/** Section header icon, gradient tile at sm size by default. */
export function SectionIcon({
  meta,
  rewardType,
  size = "sm",
}: {
  meta?: IconTileMeta;
  rewardType?: string;
  size?: CofexIconTileSize;
}): ReactNode {
  if (rewardType) return <CofexIconTile rewardType={rewardType} size={size} />;
  if (meta) return <CofexIconTile meta={meta} size={size} />;
  return null;
}

/** @deprecated Use CofexIconTile, kept for existing imports. */
export function BeverageIcon({
  id,
  size = "md",
  className,
}: {
  id: string;
  size?: CofexIconTileSize;
  className?: string;
}) {
  return <CofexIconTile rewardType={id} size={size} className={className} />;
}

export function RewardTypeChip({
  type,
  label,
  className = "",
}: {
  type: string;
  label: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <CofexIconTile rewardType={type} size="xs" />
      <span>{label}</span>
    </span>
  );
}

/** Renders a catalog / meta icon ref as a gradient tile. */
export function ResolvedIconTile({
  icon,
  size = "md",
  className,
}: {
  icon: { rewardType: string } | { meta: IconTileMeta };
  size?: CofexIconTileSize;
  className?: string;
}) {
  if ("rewardType" in icon) {
    return <CofexIconTile rewardType={icon.rewardType} size={size} className={className} />;
  }
  return <CofexIconTile meta={icon.meta} size={size} className={className} />;
}

export type { IconTileMeta };
