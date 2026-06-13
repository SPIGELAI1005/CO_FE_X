import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export async function downloadParticipationQrPdf(options: {
  url: string;
  campaignTitle: string;
  shopName?: string;
}) {
  const qrDataUrl = await QRCode.toDataURL(options.url, {
    width: 400,
    margin: 2,
    color: { dark: "#3d2417", light: "#ffffff" },
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(251, 250, 246);
  doc.rect(0, 0, pageW, 297, "F");

  doc.setTextColor(61, 36, 23);
  doc.setFontSize(22);
  doc.text("CO:FE(X) · We Give EEFFOC", pageW / 2, 28, { align: "center" });

  doc.setFontSize(14);
  doc.text(options.campaignTitle, pageW / 2, 40, { align: "center", maxWidth: 160 });

  if (options.shopName) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(options.shopName, pageW / 2, 48, { align: "center" });
  }

  const qrSize = 90;
  doc.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, 58, qrSize, qrSize);

  doc.setFontSize(12);
  doc.setTextColor(61, 36, 23);
  doc.text("Scan to join the campaign", pageW / 2, 158, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const lines = doc.splitTextToSize(options.url, 160);
  doc.text(lines, pageW / 2, 168, { align: "center" });

  doc.setFontSize(10);
  doc.text("Free coffee. Real posts. Real rewards.", pageW / 2, 190, { align: "center" });

  const filename = `eeffoc-${options.campaignTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`;
  doc.save(filename);
}
