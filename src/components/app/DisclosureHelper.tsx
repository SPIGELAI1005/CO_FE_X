import { useTranslation } from "react-i18next";
import { Copy, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { DISCLOSURE_HASHTAGS } from "@/lib/campaign-compliance";
import { buildDisclosureHashtagsLine, buildDisclosureText, copyText } from "@/lib/social-post-assistant";

interface DisclosureHelperProps {
  locale?: string;
  prominent?: boolean;
}

export function DisclosureHelper({ locale, prominent = false }: DisclosureHelperProps) {
  const { t, i18n } = useTranslation();
  const lang = locale ?? i18n.language;
  const disclosure = buildDisclosureText(lang);
  const hashtagsLine = buildDisclosureHashtagsLine();

  async function copyTag(tag: string) {
    const ok = await copyText(tag);
    toast.success(ok ? t("compliance.copied", { label: tag }) : t("socialAssistant.copyFailed"));
  }

  return (
    <div
      className={`rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 ${
        prominent ? "shadow-sm" : ""
      }`}
      role="note"
      aria-label={t("compliance.disclosureTitle")}
    >
      <div className="flex items-start gap-2">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            {t("compliance.disclosureTitle")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-950">{disclosure}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISCLOSURE_HASHTAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => copyTag(tag)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500 bg-white px-3 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
              >
                {tag}
                <Copy className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => copyTag(hashtagsLine)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-600 bg-amber-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-amber-700"
            >
              {t("compliance.copyAllTags")}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
