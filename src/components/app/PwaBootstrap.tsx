import { useEffect } from "react";
import { registerServiceWorker } from "@/hooks/use-pwa-install";

export function PwaBootstrap() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
