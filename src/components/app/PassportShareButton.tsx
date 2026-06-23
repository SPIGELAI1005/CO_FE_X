import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { buildPassportShareSummary } from "@/lib/passport-stamps";
import { copyText } from "@/lib/social-post-assistant";

interface PassportShareButtonProps {
  explorerName: string;
  stampCount: number;
  cafeCount: number;
  cityCount: number;
  rewardCount: number;
  favoriteRewardLabel?: string | null;
}

export function PassportShareButton(props: PassportShareButtonProps) {
  const { t, i18n } = useTranslation();

  async function share() {
    const text = buildPassportShareSummary({
      ...props,
      locale: i18n.language,
    });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: t("passportPage.shareTitle"),
          text,
        });
        return;
      }
      const ok = await copyText(text);
      toast.success(ok ? t("passportPage.shareCopied") : t("passportPage.shareFailed"));
    } catch {
      // user cancelled share
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={share}
      className="rounded-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20"
    >
      <Share2 className="mr-1.5 h-4 w-4" />
      {t("passportPage.sharePassport")}
    </Button>
  );
}
