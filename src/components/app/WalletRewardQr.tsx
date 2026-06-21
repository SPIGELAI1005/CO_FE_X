import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { RotatingVerifyDisplay } from "@/components/app/RotatingVerifyDisplay";
import { walletVerifyUrl } from "@/lib/shop-door";
import { Gift } from "lucide-react";

export function WalletRewardQr({ redemptionCode, itemName }: { redemptionCode: string; itemName: string }) {
  const verifyUrl = walletVerifyUrl(redemptionCode);

  return (
    <div className="rounded-2xl border-2 border-[color:var(--cofex-accent-gold)] bg-gradient-to-br from-[color:var(--cofex-cream)] to-amber-50 p-5 text-center">
      <Gift className="mx-auto h-7 w-7 text-[color:var(--cofex-coffee-deep)]" />
      <p className="mt-2 font-semibold text-[color:var(--cofex-coffee-deep)]">{itemName}</p>
      <div className="mt-4 space-y-3">
        <CampaignQrCode value={verifyUrl} size={160} label="Show QR at counter" />
        <RotatingVerifyDisplay code={redemptionCode} label="Live code" />
        <div className="font-mono text-lg font-bold tracking-[0.25em]">{redemptionCode}</div>
      </div>
    </div>
  );
}
