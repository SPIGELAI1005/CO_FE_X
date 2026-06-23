import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { RotatingVerifyDisplay } from "@/components/app/RotatingVerifyDisplay";
import { campaignVerifyUrl } from "@/lib/campaign-fulfillment";
import { formatRewardExpiry, resolveRewardDisplayStatus, type RewardLifecycleStatus } from "@/lib/shop-door";
import { CheckCircle2, Clock, Gift, MapPin, ScanLine, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CampaignRewardQrProps {
  redemptionCode: string;
  campaignTitle: string;
  shopName: string;
  rewardDescription?: string | null;
  pointsAwarded?: number;
  usedAt?: string | null;
  expiresAt?: string | null;
  rewardStatus?: RewardLifecycleStatus | string | null;
  giftPending?: boolean;
}

export function CampaignRewardQr({
  redemptionCode,
  campaignTitle,
  shopName,
  rewardDescription,
  pointsAwarded,
  usedAt,
  expiresAt,
  rewardStatus,
  giftPending,
}: CampaignRewardQrProps) {
  const { t, i18n } = useTranslation();
  const status = resolveRewardDisplayStatus({ usedAt, expiresAt, rewardStatus });
  const expiryLabel = formatRewardExpiry(expiresAt, i18n.language);
  const verifyUrl = campaignVerifyUrl(redemptionCode);
  const isActive = status === "unlocked" && !giftPending;

  return (
    <div
      className={`rounded-2xl border-2 p-6 text-center ${
        status === "redeemed"
          ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-100"
          : status === "expired"
            ? "border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100"
            : "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100"
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {status === "redeemed" ? (
          <CheckCircle2 className="h-8 w-8 text-emerald-700" />
        ) : status === "expired" ? (
          <XCircle className="h-8 w-8 text-slate-500" />
        ) : (
          <Gift className="h-8 w-8 text-amber-700" />
        )}
        <p className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
          {t(`rewardCard.status.${status}`)}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">
          {t("rewardCard.campaign")}
        </p>
        <p className="mt-1 font-semibold text-[color:var(--cofex-coffee-deep)]">{campaignTitle}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--cofex-black)]/70">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {shopName}
        </p>
        {rewardDescription ? (
          <p className="mt-2 text-sm font-medium text-amber-900">{rewardDescription}</p>
        ) : null}
        {expiryLabel ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-[color:var(--cofex-black)]/55">
            <Clock className="h-3 w-3" />
            {status === "expired"
              ? t("rewardCard.expiredAt", { date: expiryLabel })
              : t("rewardCard.expiresAt", { date: expiryLabel })}
          </p>
        ) : null}
      </div>

      {giftPending && status === "unlocked" ? (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-4 text-center">
          <p className="font-semibold text-rose-800">{t("rewardCard.giftPendingTitle")}</p>
          <p className="mt-1 text-sm text-rose-700/80">{t("rewardCard.giftPendingHint")}</p>
        </div>
      ) : isActive ? (
        <>
          <p className="mt-4 text-sm font-semibold text-amber-900">{t("rewardCard.showToTeam")}</p>
          <div className="mt-4 flex flex-col items-center gap-4">
            <CampaignQrCode value={verifyUrl} size={200} label={t("rewardCard.qrLabel")} />
            <RotatingVerifyDisplay code={redemptionCode} label={t("rewardCard.liveCode")} />
            <div className="w-full rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                {t("rewardCard.backupCode")}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-900">
                {redemptionCode}
              </div>
            </div>
          </div>
          <p className="mt-3 inline-flex items-center justify-center gap-1 text-xs text-amber-800/80">
            <ScanLine className="h-3.5 w-3.5" /> {t("rewardCard.scanHint")}
          </p>
        </>
      ) : status === "redeemed" && usedAt ? (
        <p className="mt-4 text-sm font-medium text-emerald-800">
          {t("rewardCard.redeemedAt", {
            date: new Date(usedAt).toLocaleString(i18n.language, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      ) : status === "expired" ? (
        <p className="mt-4 text-sm text-slate-600">{t("rewardCard.expiredHint")}</p>
      ) : null}

      {pointsAwarded != null && pointsAwarded > 0 ? (
        <p className="mt-3 text-xs text-amber-800">+{pointsAwarded} {t("rewardCard.bonusPoints")}</p>
      ) : null}
    </div>
  );
}
