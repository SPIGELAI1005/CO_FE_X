import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseVerifyInput } from "@/lib/parse-verify-code";

interface VerifyQrScannerProps {
  onCode: (code: string) => void;
  disabled?: boolean;
  cooldownMs?: number;
}

export function VerifyQrScanner({ onCode, disabled, cooldownMs = 2000 }: VerifyQrScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef(0);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s?.isScanning) {
        void s.stop().then(() => s.clear()).catch(() => undefined);
      }
    };
  }, []);

  async function startScanner() {
    if (disabled || active || starting) return;
    setStarting(true);
    setError(null);
    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decoded) => {
          const now = Date.now();
          if (now - lastScanRef.current < cooldownMs) return;
          if (!parseVerifyInput(decoded)) return;
          lastScanRef.current = now;
          onCode(decoded);
        },
        () => undefined,
      );
      setActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start camera";
      if (message.toLowerCase().includes("notallowed") || message.toLowerCase().includes("permission")) {
        setError("Camera permission denied. Enable camera access or enter the code manually.");
      } else if (message.toLowerCase().includes("notfound")) {
        setError("No camera found on this device.");
      } else {
        setError(message);
      }
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    setActive(false);
    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
    } catch {
      // ignore teardown errors
    }
  }

  return (
    <div className="space-y-3">
      <div
        id={regionId}
        className="cofex-scan-frame relative mx-auto max-w-sm overflow-hidden bg-[color:var(--cofex-black)]/5"
        style={{ minHeight: active ? 280 : 200 }}
      >
        {!active && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[color:var(--cofex-black)]/55">
            <Camera className="h-8 w-8 text-[color:var(--cofex-cyan)]" />
            Point your camera at the explorer&apos;s reward QR
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button type="button" onClick={startScanner} disabled={disabled || starting} className="rounded-full" variant="outline">
            {starting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
            Start camera
          </Button>
        ) : (
          <Button type="button" onClick={stopScanner} variant="outline" className="rounded-full">
            <CameraOff className="mr-1 h-4 w-4" /> Stop camera
          </Button>
        )}
      </div>
    </div>
  );
}
