import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { userSharesLocation } from "@/lib/anti-fraud";
import { useUpdatePrivacyPreferences } from "@/lib/queries/profile";
import { toast } from "sonner";

interface ProfilePrivacyCardProps {
  userId: string;
  privacyPreferences?: Record<string, unknown> | null;
}

export function ProfilePrivacyCard({ userId, privacyPreferences }: ProfilePrivacyCardProps) {
  const { t } = useTranslation();
  const updatePrivacy = useUpdatePrivacyPreferences();
  const shareLocation = userSharesLocation(privacyPreferences);

  async function toggleShareLocation(enabled: boolean) {
    try {
      await updatePrivacy.mutateAsync({
        userId,
        privacy_preferences: {
          ...(privacyPreferences ?? {}),
          share_location: enabled,
        },
      });
      toast.success(t("profilePrivacy.saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profilePrivacy.saveFailed"));
    }
  }

  return (
    <div className="cofex-app-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">{t("profilePrivacy.title")}</h3>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("profilePrivacy.shareLocation")}</p>
          <p className="text-xs text-[color:var(--cofex-black)]/55 mt-0.5">{t("profilePrivacy.shareLocationHint")}</p>
        </div>
        <Switch
          checked={shareLocation}
          disabled={updatePrivacy.isPending}
          onCheckedChange={toggleShareLocation}
        />
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-[color:var(--border)] pt-3">
        <div>
          <p className="text-sm font-semibold">{t("profilePrivacy.shareMoments")}</p>
          <p className="text-xs text-[color:var(--cofex-black)]/55 mt-0.5">{t("profilePrivacy.shareMomentsHint")}</p>
        </div>
        <Switch
          checked={privacyPreferences?.share_moments_publicly === true}
          disabled={updatePrivacy.isPending}
          onCheckedChange={async (enabled) => {
            try {
              await updatePrivacy.mutateAsync({
                userId,
                privacy_preferences: {
                  ...(privacyPreferences ?? {}),
                  share_moments_publicly: enabled,
                },
              });
              toast.success(t("profilePrivacy.saved"));
            } catch (e) {
              toast.error(e instanceof Error ? e.message : t("profilePrivacy.saveFailed"));
            }
          }}
        />
      </div>
    </div>
  );
}
