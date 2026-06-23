import { useState } from "react";
import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { campaignParticipationUrl } from "@/lib/campaign-fulfillment";
import { downloadParticipationQrPdf } from "@/lib/participation-qr-pdf";
import { Download, FileDown, Loader2, Printer, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface CampaignParticipationQrProps {
  campaignId: string;
  campaignTitle: string;
  participationToken?: string | null;
  shopName?: string;
}

export function CampaignParticipationQr({
  campaignId,
  campaignTitle,
  participationToken,
  shopName,
}: CampaignParticipationQrProps) {
  const { t } = useTranslation();
  const url = campaignParticipationUrl(campaignId, participationToken);
  const [pdfBusy, setPdfBusy] = useState(false);

  function printQr() {
    window.print();
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      await downloadParticipationQrPdf({ url, campaignTitle, shopName });
      toast.success(t("partnerCampaignsPage.pdfDownloaded"));
    } catch {
      toast.error(t("partnerCampaignsPage.pdfFailed"));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="cofex-reward-qr partner-qr-print p-5">
      <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-coffee-deep)]">
        <QrCode className="h-4 w-4 text-[color:var(--cofex-cyan)]" /> {t("partnerCampaignsPage.qrTitle")}
      </div>
      <p className="relative mt-1 text-sm text-[color:var(--cofex-black)]/65">
        {t("partnerCampaignsPage.qrHint", { title: campaignTitle })}
      </p>
      <div className="relative mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="cofex-scan-frame p-3">
          <CampaignQrCode value={url} label={t("partnerCampaignsPage.qrScanLabel")} />
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Link</div>
            <p className="mt-1 break-all font-mono text-xs text-amber-950">{url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Download className="h-3.5 w-3.5" /> {t("partnerCampaignsPage.openJoinPage")}
            </a>
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={pdfBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-60"
            >
              {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              {t("partnerCampaignsPage.downloadPdf")}
            </button>
            <button
              type="button"
              onClick={printQr}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
            >
              <Printer className="h-3.5 w-3.5" /> {t("partnerCampaignsPage.printQr")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
