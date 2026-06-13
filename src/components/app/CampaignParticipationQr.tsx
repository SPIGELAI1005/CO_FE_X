import { useState } from "react";
import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { campaignParticipationUrl } from "@/lib/campaign-fulfillment";
import { downloadParticipationQrPdf } from "@/lib/participation-qr-pdf";
import { Download, FileDown, Loader2, QrCode } from "lucide-react";
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
  const url = campaignParticipationUrl(campaignId, participationToken);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      await downloadParticipationQrPdf({ url, campaignTitle, shopName });
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-800">
        <QrCode className="h-4 w-4" /> Participation QR
      </div>
      <p className="mt-1 text-sm text-amber-900/80">
        Print or display at your counter. Explorers scan to join <strong>{campaignTitle}</strong>.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <CampaignQrCode value={url} label="Scan to join campaign" />
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
              <Download className="h-3.5 w-3.5" /> Open join page
            </a>
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={pdfBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-60"
            >
              {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Download printable PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
