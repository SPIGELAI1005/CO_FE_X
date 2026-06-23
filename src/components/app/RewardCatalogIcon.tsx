import type { CatalogItem } from "@/lib/queries/wallet";
import { CofexIconTile, type CofexIconTileSize } from "@/components/app/CofexIconTile";
import { getRewardCatalogIcon } from "@/lib/reward-catalog-meta";

interface RewardCatalogIconProps {
  item: Pick<CatalogItem, "name" | "tier">;
  size?: "sm" | "md";
}

const SIZE_MAP: Record<"sm" | "md", CofexIconTileSize> = {
  sm: "md",
  md: "lg",
};

export function RewardCatalogIcon({ item, size = "md" }: RewardCatalogIconProps) {
  const resolved = getRewardCatalogIcon(item);
  const tileSize = SIZE_MAP[size];

  if ("rewardType" in resolved) {
    return <CofexIconTile rewardType={resolved.rewardType} size={tileSize} />;
  }

  return <CofexIconTile meta={resolved.meta} size={tileSize} />;
}
