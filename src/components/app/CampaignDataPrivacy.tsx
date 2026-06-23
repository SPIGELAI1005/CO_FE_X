import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { CAMPAIGN_DATA_POINTS } from "@/lib/campaign-compliance";

export function CampaignDataPrivacy() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--cofex-cream)]/40 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-coffee-deep)]">
        <Shield className="h-3.5 w-3.5" />
        {t("compliance.privacyTitle")}
      </h4>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[color:var(--cofex-black)]/70">
        {CAMPAIGN_DATA_POINTS.map(({ id, optional }) => (
          <li key={id} className="flex gap-2">
            <span className="text-[color:var(--cofex-cyan)]">•</span>
            <span>
              {t(`compliance.dataPoints.${id}`)}
              {optional ? ` ${t("compliance.optional")}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-[color:var(--cofex-black)]/50">
        {t("compliance.privacyFallback")}{" "}
        <Link to="/privacy" className="underline hover:text-[color:var(--cofex-coffee-deep)]">
          {t("compliance.privacyLink")}
        </Link>
      </p>
    </div>
  );
}
