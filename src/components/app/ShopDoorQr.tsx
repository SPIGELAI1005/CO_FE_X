import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CampaignQrCode } from "@/components/app/CampaignQrCode";
import { PARTNER_BTN } from "@/components/app/partner/PartnerShell";
import { downloadShopDoorQrPdf, openShopDoorQrPrintPdf } from "@/lib/shop-door-qr-pdf";
import { shopDoorUrl } from "@/lib/shop-door";
import { Button } from "@/components/ui/button";
import { DoorOpen, FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

export function ShopDoorQr({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
  const { t } = useTranslation();
  const url = shopDoorUrl(shopSlug);
  const [busy, setBusy] = useState<"print" | "download" | null>(null);

  const pdfCopy = {
    brandSubtitle: t("shopDoorQr.pdfCopy.brandSubtitle"),
    memberLine: t("shopDoorQr.pdfCopy.memberLine"),
    scanLine: t("shopDoorQr.pdfCopy.scanLine"),
    thankYouLine: t("shopDoorQr.pdfCopy.thankYouLine"),
    footerLine: t("shopDoorQr.pdfCopy.footerLine"),
  };

  async function printPoster() {
    setBusy("print");
    try {
      const mode = await openShopDoorQrPrintPdf({ url, shopName, copy: pdfCopy });
      toast.success(mode === "preview" ? t("shopDoorQr.pdfReady") : t("shopDoorQr.pdfDownloaded"));
    } catch {
      toast.error(t("shopDoorQr.pdfFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("download");
    try {
      await downloadShopDoorQrPdf({ url, shopName, copy: pdfCopy });
      toast.success(t("shopDoorQr.pdfDownloaded"));
    } catch {
      toast.error(t("shopDoorQr.pdfFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="cofex-app-card p-5">
      <div className="flex items-center gap-2 font-bold text-[color:var(--cofex-coffee-deep)]">
        <DoorOpen className="h-5 w-5" /> {t("shopDoorQr.title")}
      </div>
      <p className="mt-1 text-xs text-[color:var(--cofex-black)]/60">
        {t("shopDoorQr.hint", { shopName })}
      </p>
      <div className="mt-4 flex justify-center">
        <CampaignQrCode value={url} size={160} label={t("shopDoorQr.scanLabel")} />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          onClick={() => void printPoster()}
          disabled={busy !== null}
          className={PARTNER_BTN}
        >
          {busy === "print" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Printer className="mr-1 h-4 w-4" />
          )}
          {t("shopDoorQr.printPoster")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void downloadPdf()}
          disabled={busy !== null}
          className="rounded-full"
        >
          {busy === "download" ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-1 h-4 w-4" />
          )}
          {t("shopDoorQr.downloadPdf")}
        </Button>
      </div>
    </div>
  );
}
