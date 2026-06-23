import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { RotatingVerifyDisplay } from "@/components/app/RotatingVerifyDisplay";
import { CoffeeSteam } from "@/components/app/CofexDecor";
import { walletVerifyUrl } from "@/lib/shop-door";
import { Gift } from "lucide-react";

export function WalletRewardQr({ redemptionCode, itemName }: { redemptionCode: string; itemName: string }) {
  const verifyUrl = walletVerifyUrl(redemptionCode);

  return (
    <div className="cofex-reward-qr relative p-5 text-center">
      <div className="relative mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--gradient-gold)" }}>
        <Gift className="h-7 w-7 text-white drop-shadow" />
        <CoffeeSteam className="absolute -top-1 left-1/2 -translate-x-1/2 scale-75" />
      </div>
      <p className="relative font-extrabold text-[color:var(--cofex-coffee-deep)]">{itemName}</p>
      <p className="relative mt-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/50">
        Show at counter
      </p>
      <div className="relative mt-4 space-y-3">
        <div className="cofex-scan-frame mx-auto inline-block p-4">
          <CampaignQrCode value={verifyUrl} size={160} label="Scan to redeem" />
        </div>
        <RotatingVerifyDisplay code={redemptionCode} label="Live code" />
        <div className="cofex-verify-code text-lg font-bold">{redemptionCode}</div>
      </div>
    </div>
  );
}
