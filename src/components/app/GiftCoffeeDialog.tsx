import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSendGift } from "@/lib/queries/vision";

export function GiftCoffeeDialog() {
  const { t } = useTranslation();
  const sendGift = useSendGift();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null);

  async function onSend() {
    if (!recipientId.trim()) return;
    try {
      const res = await sendGift.mutateAsync({ recipientId: recipientId.trim(), message: message.trim() || undefined });
      setCode(res.code);
      toast.success(t("gift.sent"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gift.failed"));
    }
  }

  return (
    <div className="cofex-app-card p-5">
      <div className="flex items-center gap-2 font-bold text-[color:var(--cofex-coffee-deep)]">
        <Gift className="h-5 w-5" /> {t("gift.title")}
      </div>
      <p className="mt-1 text-xs text-[color:var(--cofex-black)]/55">{t("gift.subtitle")}</p>
      {!code ? (
        <>
          <Input
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder={t("gift.recipientPlaceholder")}
            className="mt-3 rounded-full"
          />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("gift.messagePlaceholder")}
            className="mt-2 rounded-full"
          />
          <Button onClick={onSend} disabled={sendGift.isPending} className="mt-3 w-full rounded-full">
            {t("gift.sendBtn")}
          </Button>
        </>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{t("gift.codeReady")}</p>
          <p className="mt-2 font-mono text-xl tracking-widest">{code}</p>
        </div>
      )}
    </div>
  );
}
