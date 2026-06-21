import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { RotatingVerifyDisplay } from "@/components/app/RotatingVerifyDisplay";
import { campaignVerifyUrl } from "@/lib/campaign-fulfillment";
import { Gift, ScanLine } from "lucide-react";

interface CampaignRewardQrProps {
  redemptionCode: string;
  rewardDescription?: string | null;
  pointsAwarded?: number;
  usedAt?: string | null;
}

export function CampaignRewardQr({
  redemptionCode,
  rewardDescription,
  pointsAwarded,
  usedAt,
}: CampaignRewardQrProps) {
  const verifyUrl = campaignVerifyUrl(redemptionCode);

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100 p-6 text-center">
      <Gift className="mx-auto h-8 w-8 text-amber-700" />
      <p className="mt-2 font-semibold text-amber-900">Your EEFFOC reward is ready!</p>
      {rewardDescription ? (
        <p className="mt-1 text-sm text-amber-800">{rewardDescription}</p>
      ) : null}
      <div className="mt-5 flex flex-col items-center gap-4">
        <CampaignQrCode value={verifyUrl} size={200} label="Show this QR at the counter" />
        <RotatingVerifyDisplay code={redemptionCode} label="Live code" />
        <div className="w-full rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Backup code</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-900">{redemptionCode}</div>
        </div>
      </div>
      {pointsAwarded != null && pointsAwarded > 0 ? (
        <p className="mt-3 text-xs text-amber-800">+{pointsAwarded} bonus points awarded</p>
      ) : null}
      <p className="mt-3 inline-flex items-center justify-center gap-1 text-xs text-amber-800/80">
        <ScanLine className="h-3.5 w-3.5" /> Staff scans QR or enters code at verify
      </p>
      {usedAt ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Redeemed at counter</p>
      ) : null}
    </div>
  );
}
