import { useCallback, useState } from "react";
import { useSavePushSubscription } from "@/lib/queries/vision";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const save = useSavePushSubscription();
  const [enabled, setEnabled] = useState(false);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notifications are not supported in this browser");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission denied");

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error("Push is not configured yet");

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await save.mutateAsync(sub.toJSON());
    setEnabled(true);
  }, [save]);

  return { subscribe, enabled, isPending: save.isPending };
}
