import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, MapPin, QrCode, Smartphone } from "lucide-react";
import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { REWARD_MARKER_STYLES } from "@/lib/map/campaign-markers";
import type { WizardFormState } from "@/lib/campaign-wizard";
import {
  buildRewardDescription,
  formatQuantityExample,
  resolveTimingDates,
} from "@/lib/campaign-wizard";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

type PreviewTab = "explorer" | "map" | "qr" | "reward";

interface CampaignWizardPreviewProps {
  form: WizardFormState;
  shopName: string;
}

export function CampaignWizardPreview({ form, shopName }: CampaignWizardPreviewProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PreviewTab>("explorer");
  const rewardType = form.reward_type as CampaignRewardType;
  const style = REWARD_MARKER_STYLES[rewardType];
  const rewardLabel = buildRewardDescription(rewardType, form.reward_quantity);
  const { end } = resolveTimingDates(form.timing_preset, form.custom_start, form.custom_end);
  const hashtags = form.hashtags
    .split(/[,\s]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .join(" ");

  const tabs: { id: PreviewTab; icon: typeof Smartphone; labelKey: string }[] = [
    { id: "explorer", icon: Smartphone, labelKey: "campaignWizard.preview.explorer" },
    { id: "map", icon: MapPin, labelKey: "campaignWizard.preview.map" },
    { id: "qr", icon: QrCode, labelKey: "campaignWizard.preview.qr" },
    { id: "reward", icon: Gift, labelKey: "campaignWizard.preview.reward" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === id ? "bg-amber-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "explorer" && (
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-100 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
            {t("campaignWizard.preview.explorerHint")}
          </div>
          <div className="mt-2 text-2xl">{style.emoji}</div>
          <h3 className="mt-1 text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {form.title || t("campaignWizard.preview.untitled")}
          </h3>
          <p className="mt-1 text-sm text-zinc-700">
            {form.description || t("campaignWizard.preview.noDescription")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <PreviewRow label={t("campaignWizard.preview.reward")} value={rewardLabel} />
            <PreviewRow label={t("campaignWizard.preview.shop")} value={shopName} />
            <PreviewRow
              label={t("campaignWizard.preview.spots")}
              value={String(form.max_participants)}
            />
            <PreviewRow label={t("campaignWizard.preview.ends")} value={end.toLocaleDateString()} />
          </div>
          {hashtags && (
            <p className="mt-3 text-xs font-medium text-amber-900">{hashtags}</p>
          )}
        </div>
      )}

      {tab === "map" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6">
          <p className="text-xs text-zinc-500">{t("campaignWizard.preview.mapHint")}</p>
          <div
            className="cofex-campaign-pin cofex-campaign-pin--pulse relative"
            style={{ "--pin-color": style.color, "--pin-ring": style.ring } as React.CSSProperties}
          >
            <div className="cofex-campaign-pin__glow" />
            <div className="cofex-campaign-pin__body">
              <span className="cofex-campaign-pin__emoji">{style.emoji}</span>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-2xl border bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)] p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              We give EEFFOC!
            </p>
            <p className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{shopName}</p>
            <p className="mt-1 text-sm font-bold">{form.title || "…"}</p>
            <span
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
              style={{ background: style.color }}
            >
              {style.emoji} {t(`campaignMap.rewardTypes.${rewardType}`)}
            </span>
            <p className="mt-2 text-xs text-zinc-600">{rewardLabel}</p>
          </div>
        </div>
      )}

      {tab === "qr" && (
        <div className="flex flex-col items-center rounded-2xl border bg-white p-6">
          <p className="mb-4 text-xs text-zinc-500">{t("campaignWizard.preview.qrHint")}</p>
          <CampaignQrCode
            value="https://cofex.app/campaign/preview"
            label={t("campaignWizard.preview.qrLabel")}
            size={160}
          />
          <p className="mt-3 text-center text-sm font-semibold">{form.title || shopName}</p>
        </div>
      )}

      {tab === "reward" && (
        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100 p-6 text-center">
          <Gift className="mx-auto h-8 w-8 text-amber-700" />
          <p className="mt-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {t("rewardCard.status.unlocked")}
          </p>
          <div className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-left text-sm shadow-sm">
            <p className="font-bold">{form.title || t("campaignWizard.preview.untitled")}</p>
            <p className="text-zinc-600">{shopName}</p>
            <p className="mt-2 font-semibold text-amber-800">
              {formatQuantityExample(rewardType, form.reward_quantity)}
            </p>
            {form.points_reward > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                +{form.points_reward} {t("campaignWizard.preview.points")}
              </p>
            )}
          </div>
          <div className="mt-4 rounded-lg border-2 border-dashed border-amber-300 bg-white/50 px-4 py-8 text-xs text-zinc-500">
            {t("campaignWizard.preview.qrPlaceholder")}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
