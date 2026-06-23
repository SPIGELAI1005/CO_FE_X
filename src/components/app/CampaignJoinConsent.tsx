import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DisclosureHelper } from "@/components/app/DisclosureHelper";
import { CampaignDataPrivacy } from "@/components/app/CampaignDataPrivacy";
import { buildCombinedTerms, needsDisclosureAcknowledgment } from "@/lib/campaign-compliance";
import type { CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";

interface CampaignJoinConsentProps {
  fulfillmentMode: CampaignFulfillmentMode;
  cafeTerms?: string | null;
  requirements?: string | null;
  scannedViaQr?: boolean;
  disabled?: boolean;
  disabledReason?: "full" | "ended" | "not_started";
  startsAt?: string | null;
  busy?: boolean;
  onJoin: (consent: { termsAccepted: boolean; disclosureAcknowledged: boolean }) => void;
}

export function CampaignJoinConsent({
  fulfillmentMode,
  cafeTerms,
  requirements,
  scannedViaQr,
  disabled,
  disabledReason,
  startsAt,
  busy,
  onJoin,
}: CampaignJoinConsentProps) {
  const { t, i18n } = useTranslation();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);
  const [requirementsUnderstood, setRequirementsUnderstood] = useState(false);

  const needsDisclosure = needsDisclosureAcknowledgment(fulfillmentMode);
  const { platformTerms, cafeTerms: cafeBlock } = buildCombinedTerms({
    cafeTerms,
    locale: i18n.language,
  });

  const canJoin =
    termsAccepted &&
    requirementsUnderstood &&
    (!needsDisclosure || disclosureAcknowledged) &&
    !disabled &&
    !busy;

  return (
    <div className="cofex-app-card border-2 border-[color:var(--cofex-cyan)]/30 bg-gradient-to-br from-[color:var(--cofex-pastel-blue)]/30 to-white p-5 space-y-4">
      <div className="text-center">
        <Rocket className="mx-auto h-8 w-8 text-[color:var(--cofex-cyan)]" />
        <p className="mt-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
          {t("campaignMission.readyTitle")}
        </p>
        <p className="mt-1 text-sm text-[color:var(--cofex-black)]/65">{t("campaignMission.readySubtitle")}</p>
        {scannedViaQr && (
          <p className="mt-2 text-xs font-medium text-amber-800">{t("compliance.qrScannedHint")}</p>
        )}
      </div>

      {needsDisclosure && <DisclosureHelper prominent />}

      <div className="rounded-xl border border-[color:var(--border)] bg-white p-4 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
          {t("compliance.termsHeading")}
        </p>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[color:var(--cofex-black)]/75">{platformTerms}</p>
        {cafeBlock && (
          <>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
              {t("compliance.cafeTermsHeading")}
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[color:var(--cofex-black)]/75">{cafeBlock}</p>
          </>
        )}
        {requirements && (
          <>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
              {t("campaignMission.rewardRules")}
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[color:var(--cofex-black)]/75">{requirements}</p>
          </>
        )}
      </div>

      <CampaignDataPrivacy />

      <div className="space-y-3">
        <ConsentRow
          id="terms"
          checked={termsAccepted}
          onCheckedChange={setTermsAccepted}
          label={t("compliance.acceptTermsShort")}
        />
        <ConsentRow
          id="requirements"
          checked={requirementsUnderstood}
          onCheckedChange={setRequirementsUnderstood}
          label={t("compliance.understandRequirements")}
        />
        {needsDisclosure && (
          <ConsentRow
            id="disclosure"
            checked={disclosureAcknowledged}
            onCheckedChange={setDisclosureAcknowledged}
            label={t("compliance.acknowledgeDisclosure")}
          />
        )}
      </div>

      <Button
        disabled={!canJoin}
        onClick={() => onJoin({ termsAccepted, disclosureAcknowledged })}
        className="w-full rounded-full bg-[color:var(--cofex-coffee-deep)] py-6 text-base font-bold hover:bg-[color:var(--cofex-black)]"
        size="lg"
      >
        {busy
          ? t("campaignMission.starting")
          : disabledReason === "full"
            ? t("campaignMission.campaignFull")
            : disabledReason === "ended"
              ? t("campaignMission.campaignEnded")
              : disabledReason === "not_started"
                ? startsAt
                  ? t("campaignMission.campaignNotStartedOn", {
                      date: new Date(startsAt).toLocaleDateString(i18n.language),
                    })
                  : t("campaignMission.campaignNotStarted")
                : t("campaignMission.startMission")}
      </Button>
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] bg-white p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} className="mt-0.5" />
      <Label htmlFor={id} className="cursor-pointer text-xs leading-relaxed text-[color:var(--cofex-coffee-deep)]">
        {label}
      </Label>
    </div>
  );
}
