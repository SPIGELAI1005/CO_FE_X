import { useEffect, useState } from "react";
import { generateBrandedQrDataUrl } from "@/lib/qr-code-brand";

interface CampaignQrCodeProps {
  value: string;
  label?: string;
  size?: number;
  className?: string;
  showLogo?: boolean;
}

export function CampaignQrCode({
  value,
  label,
  size = 180,
  className = "",
  showLogo = true,
}: CampaignQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateBrandedQrDataUrl(value, { width: size, showLogo })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, showLogo]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-[color:var(--cofex-cream)] ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-[color:var(--cofex-black)]/45">Loading QR…</span>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <img
        src={dataUrl}
        alt={label ?? "QR code"}
        width={size}
        height={size}
        className="mx-auto rounded-2xl border border-[color:var(--border)] bg-white p-2 shadow-sm"
      />
      {label ? <p className="mt-2 text-xs text-[color:var(--cofex-black)]/55">{label}</p> : null}
    </div>
  );
}
