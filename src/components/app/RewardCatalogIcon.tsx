import type { CatalogItem } from "@/lib/queries/wallet";
import {
  getRewardCatalogMeta,
  rewardCatalogIconBoxClass,
  rewardCatalogIconClass,
} from "@/lib/reward-catalog-meta";

interface RewardCatalogIconProps {
  item: Pick<CatalogItem, "name" | "tier">;
  size?: "sm" | "md";
}

export function RewardCatalogIcon({ item, size = "md" }: RewardCatalogIconProps) {
  const { Icon, accent } = getRewardCatalogMeta(item);
  const box = size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl";
  const icon = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${box} ${rewardCatalogIconBoxClass(accent)}`}
      aria-hidden
    >
      <Icon className={`${icon} ${rewardCatalogIconClass(accent)}`} strokeWidth={2} />
    </div>
  );
}
