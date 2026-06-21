import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { shopDoorUrl } from "@/lib/shop-door";
import { DoorOpen } from "lucide-react";

export function ShopDoorQr({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
  const url = shopDoorUrl(shopSlug);

  return (
    <div className="cofex-app-card p-5">
      <div className="flex items-center gap-2 font-bold text-[color:var(--cofex-coffee-deep)]">
        <DoorOpen className="h-5 w-5" /> Door QR
      </div>
      <p className="mt-1 text-xs text-[color:var(--cofex-black)]/60">
        Print at the entrance — explorers scan to open {shopName} and check in.
      </p>
      <div className="mt-4 flex justify-center">
        <CampaignQrCode value={url} size={160} label="Scan at door" />
      </div>
    </div>
  );
}
