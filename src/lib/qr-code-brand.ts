import QRCode from "qrcode";
import cofexQrIcon from "@/assets/cofex-qr-icon.png";

export interface BrandedQrOptions {
  width?: number;
  margin?: number;
  dark?: string;
  light?: string;
  logoSrc?: string;
  /** Logo width as a fraction of the QR code width (level-H correction supports ~0.33). */
  logoScale?: number;
  showLogo?: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load QR logo"));
    img.src = src;
  });
}

/** QR data URL with optional centered CO:FE(X) logo (error correction level H). */
export async function generateBrandedQrDataUrl(
  value: string,
  {
    width = 180,
    margin = 2,
    dark = "#3d2417",
    light = "#ffffff",
    logoSrc = cofexQrIcon,
    logoScale = 0.33,
    showLogo = true,
  }: BrandedQrOptions = {},
): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, value, {
    width,
    margin,
    errorCorrectionLevel: "H",
    color: { dark, light },
  });

  if (showLogo) {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return canvas.toDataURL("image/png");

      const logo = await loadImage(logoSrc);
      const logoSize = Math.round(width * logoScale);
      const pad = Math.max(4, Math.round(logoSize * 0.1));
      const badgeSize = logoSize + pad * 2;
      const badgeX = (width - badgeSize) / 2;
      const badgeY = (width - badgeSize) / 2;

      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(width / 2, width / 2, badgeSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(logo, badgeX + pad, badgeY + pad, logoSize, logoSize);
    } catch {
      // Plain QR is still scannable if the logo asset fails to load.
    }
  }

  return canvas.toDataURL("image/png");
}
