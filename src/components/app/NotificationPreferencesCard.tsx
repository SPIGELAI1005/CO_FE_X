import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  EXPLORER_CATEGORIES,
  PARTNER_CATEGORIES,
  mergeNotificationPreferences,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
import { useUpdateNotificationPreferences } from "@/lib/queries/profile";

interface NotificationPreferencesCardProps {
  userId: string;
  notificationPreferences?: NotificationPreferences | null;
  variant?: "explorer" | "partner";
}

const CATEGORY_LABEL_KEYS: Record<NotificationCategory, string> = {
  campaigns: "notificationPrefs.categories.campaigns",
  rewards: "notificationPrefs.categories.rewards",
  social: "notificationPrefs.categories.social",
  badges: "notificationPrefs.categories.badges",
  trails: "notificationPrefs.categories.trails",
  gifts: "notificationPrefs.categories.gifts",
  partner_activity: "notificationPrefs.categories.partnerActivity",
  analytics: "notificationPrefs.categories.analytics",
};

export function NotificationPreferencesCard({
  userId,
  notificationPreferences,
  variant = "explorer",
}: NotificationPreferencesCardProps) {
  const { t } = useTranslation();
  const updatePrefs = useUpdateNotificationPreferences();
  const prefs = mergeNotificationPreferences(notificationPreferences);
  const categories = variant === "partner" ? PARTNER_CATEGORIES : EXPLORER_CATEGORIES;

  async function save(next: NotificationPreferences) {
    try {
      await updatePrefs.mutateAsync({ userId, notification_preferences: next });
      toast.success(t("notificationPrefs.saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("notificationPrefs.saveFailed"));
    }
  }

  function toggleMaster(enabled: boolean) {
    void save({ ...prefs, in_app_enabled: enabled });
  }

  function toggleCategory(category: NotificationCategory, enabled: boolean) {
    void save({
      ...prefs,
      categories: { ...prefs.categories, [category]: enabled },
    });
  }

  return (
    <div className="cofex-app-card space-y-4 p-4">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 text-[color:var(--cofex-cyan)]" />
        <div>
          <h3 className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">{t("notificationPrefs.title")}</h3>
          <p className="mt-0.5 text-xs text-[color:var(--cofex-black)]/55">{t("notificationPrefs.subtitle")}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-white p-3">
        <div>
          <p className="text-sm font-semibold">{t("notificationPrefs.inApp")}</p>
          <p className="text-xs text-[color:var(--cofex-black)]/55 mt-0.5">{t("notificationPrefs.inAppHint")}</p>
        </div>
        <Switch
          checked={prefs.in_app_enabled}
          disabled={updatePrefs.isPending}
          onCheckedChange={toggleMaster}
        />
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category}
            className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-white px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-[color:var(--cofex-coffee-deep)]">
                {t(CATEGORY_LABEL_KEYS[category])}
              </p>
              <p className="text-[10px] text-[color:var(--cofex-black)]/50">
                {t(`notificationPrefs.hints.${category}`)}
              </p>
            </div>
            <Switch
              checked={prefs.categories[category] !== false}
              disabled={updatePrefs.isPending || !prefs.in_app_enabled}
              onCheckedChange={(v) => toggleCategory(category, v)}
            />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[color:var(--cofex-black)]/45">{t("notificationPrefs.pushNote")}</p>
    </div>
  );
}
