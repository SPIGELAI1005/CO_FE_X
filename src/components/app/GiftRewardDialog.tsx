import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Gift, Heart, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rewardGiftUrl } from "@/lib/reward-gifts";
import {
  useCancelRewardGift,
  useCreateRewardGift,
  useResolveExplorerByHandle,
} from "@/lib/queries/reward-gifts";

interface GiftRewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redemptionId: string;
  campaignTitle: string;
  shopName: string;
  pendingGift?: { id: string; gift_token: string } | null;
}

export function GiftRewardDialog({
  open,
  onOpenChange,
  redemptionId,
  campaignTitle,
  shopName,
  pendingGift,
}: GiftRewardDialogProps) {
  const { t } = useTranslation();
  const createGift = useCreateRewardGift();
  const cancelGift = useCancelRewardGift();
  const resolveHandle = useResolveExplorerByHandle();
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [resolvedFriend, setResolvedFriend] = useState<{
    id: string;
    display_name: string | null;
    handle: string | null;
  } | null>(null);
  const [giftToken, setGiftToken] = useState<string | null>(pendingGift?.gift_token ?? null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setGiftToken(pendingGift?.gift_token ?? null);
      setCopied(false);
    }
  }, [open, pendingGift?.gift_token]);

  const giftLink = giftToken ? rewardGiftUrl(giftToken) : null;

  async function lookupFriend() {
    if (!handle.trim()) return;
    try {
      const friend = await resolveHandle.mutateAsync(handle.trim());
      if (!friend?.id) {
        toast.error(t("rewardGift.friendNotFound"));
        setResolvedFriend(null);
        return;
      }
      setResolvedFriend(friend);
    } catch {
      toast.error(t("rewardGift.friendNotFound"));
    }
  }

  async function sendGift() {
    try {
      const res = await createGift.mutateAsync({
        redemptionId,
        recipientId: resolvedFriend?.id,
        message: message.trim() || undefined,
      });
      setGiftToken(res.gift_token);
      toast.success(t("rewardGift.sentCelebrate"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("rewardGift.failed"));
    }
  }

  async function cancelPending() {
    if (!pendingGift?.id) return;
    try {
      await cancelGift.mutateAsync(pendingGift.id);
      setGiftToken(null);
      toast.success(t("rewardGift.cancelled"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("rewardGift.failed"));
    }
  }

  async function copyLink() {
    if (!giftLink) return;
    await navigator.clipboard.writeText(giftLink);
    setCopied(true);
    toast.success(t("rewardGift.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[color:var(--cofex-coffee-deep)]">
            <Gift className="h-5 w-5 text-rose-500" />
            {giftToken ? t("rewardGift.confirmTitle") : t("rewardGift.title")}
          </DialogTitle>
          <DialogDescription>
            {giftToken ? t("rewardGift.confirmSubtitle") : t("rewardGift.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-gradient-to-br from-rose-50 via-amber-50 to-[color:var(--cofex-cream)] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400/80">{t("rewardGift.youAreGifting")}</p>
          <p className="mt-1 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{campaignTitle}</p>
          <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60">{shopName}</p>
        </div>

        {giftToken ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <Heart className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{t("rewardGift.shareMoment")}</p>
            <div className="rounded-xl border border-dashed border-rose-200 bg-white px-3 py-2 font-mono text-xs break-all text-[color:var(--cofex-black)]/70">
              {giftLink}
            </div>
            <Button type="button" className="w-full rounded-full" onClick={copyLink}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {t("rewardGift.copyLink")}
            </Button>
            <p className="text-xs text-[color:var(--cofex-black)]/50">{t("rewardGift.pendingNote")}</p>
          </div>
        ) : pendingGift ? (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--cofex-black)]/65">{t("rewardGift.alreadyPending")}</p>
            <Button type="button" variant="outline" className="w-full rounded-full" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> {t("rewardGift.copyLink")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full text-rose-600"
              disabled={cancelGift.isPending}
              onClick={cancelPending}
            >
              {t("rewardGift.cancelGift")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">{t("rewardGift.friendOptional")}</p>
              <div className="mt-2 flex gap-2">
                <Input
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setResolvedFriend(null);
                  }}
                  placeholder={t("rewardGift.handlePlaceholder")}
                  className="rounded-full"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-full"
                  disabled={resolveHandle.isPending}
                  onClick={lookupFriend}
                >
                  {resolveHandle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                </Button>
              </div>
              {resolvedFriend ? (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  {resolvedFriend.display_name ?? resolvedFriend.handle}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-[color:var(--cofex-black)]/45">{t("rewardGift.linkOnlyHint")}</p>
              )}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("rewardGift.messagePlaceholder")}
              className="min-h-[72px] rounded-xl"
            />
            <Button
              type="button"
              className="w-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600"
              disabled={createGift.isPending}
              onClick={sendGift}
            >
              {createGift.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" />}
              {t("rewardGift.sendBtn")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
