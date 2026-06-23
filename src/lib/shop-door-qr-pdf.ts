import { jsPDF } from "jspdf";
import { generateBrandedQrDataUrl } from "@/lib/qr-code-brand";
import cofexQrIcon from "@/assets/cofex-qr-icon.png";

const CREAM = [251, 250, 246] as const;
const COFFEE = [61, 36, 23] as const;
const MUTED = [100, 100, 100] as const;
const CYAN = [0, 182, 240] as const;

export interface ShopDoorQrPdfCopy {
  brandSubtitle: string;
  memberLine: string;
  scanLine: string;
  thankYouLine: string;
  footerLine: string;
}

export interface ShopDoorQrPdfOptions {
  url: string;
  shopName: string;
  copy: ShopDoorQrPdfCopy;
}

async function fetchImageDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function buildShopDoorQrPdf({ url, shopName, copy }: ShopDoorQrPdfOptions) {
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    generateBrandedQrDataUrl(url, { width: 512 }),
    fetchImageDataUrl(cofexQrIcon),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;

  doc.setFillColor(...CREAM);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFillColor(...CYAN);
  doc.rect(0, 0, pageW, 3, "F");

  doc.setFillColor(...COFFEE);
  doc.rect(0, pageH - 3, pageW, 3, "F");

  let y = 22;
  const logoSize = 20;
  doc.addImage(logoDataUrl, "PNG", centerX - logoSize / 2, y - 8, logoSize, logoSize);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(copy.brandSubtitle, centerX, y, { align: "center" });
  y += 14;

  doc.setTextColor(...COFFEE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const shopLines = doc.splitTextToSize(shopName, 170);
  doc.text(shopLines, centerX, y, { align: "center" });
  y += shopLines.length * 9 + 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.text(copy.memberLine, centerX, y, { align: "center", maxWidth: 170 });
  y += 12;

  doc.setDrawColor(...CYAN);
  doc.setLineWidth(0.5);
  doc.line(centerX - 40, y, centerX + 40, y);
  y += 14;

  const qrSize = 98;
  const qrY = y;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(centerX - qrSize / 2 - 5, qrY - 5, qrSize + 10, qrSize + 10, "S");
  doc.addImage(qrDataUrl, "PNG", centerX - qrSize / 2, qrY, qrSize, qrSize);
  y = qrY + qrSize + 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COFFEE);
  doc.text(copy.scanLine, centerX, y, { align: "center" });
  y += 13;

  doc.setFontSize(17);
  doc.setTextColor(...CYAN);
  doc.text(copy.thankYouLine, centerX, y, { align: "center", maxWidth: 170 });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const urlLines = doc.splitTextToSize(url, 165);
  doc.text(urlLines, centerX, pageH - 32, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(...COFFEE);
  doc.text(copy.footerLine, centerX, pageH - 22, { align: "center" });

  return doc;
}

export async function downloadShopDoorQrPdf(options: ShopDoorQrPdfOptions) {
  const doc = await buildShopDoorQrPdf(options);
  doc.save(`cofex-door-qr-${slugify(options.shopName)}.pdf`);
}

/** Opens a print-ready A4 poster in a new tab (falls back to download if pop-ups are blocked). */
export async function openShopDoorQrPrintPdf(options: ShopDoorQrPdfOptions): Promise<"preview" | "download"> {
  const doc = await buildShopDoorQrPdf(options);
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    doc.save(`cofex-door-qr-${slugify(options.shopName)}.pdf`);
    URL.revokeObjectURL(blobUrl);
    return "download";
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return "preview";
}
