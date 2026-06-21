import type { TFunction } from "i18next";

export interface NotificationDisplayInput {
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
}

const LOCALIZED_TYPES = new Set([
  "partner_application_received",
  "partner_application_approved",
  "partner_application_rejected",
  "crawl_complete",
  "gift_received",
  "beans_earned",
  "explorer_arriving",
  "spawn_nearby",
]);

export function getNotificationDisplay(
  notification: NotificationDisplayInput,
  t: TFunction,
): { title: string; body: string | null } {
  if (!LOCALIZED_TYPES.has(notification.type)) {
    return { title: notification.title, body: notification.body };
  }

  const vars = {
    business_name: String(notification.payload?.business_name ?? ""),
    crawl_title: String(notification.payload?.crawl_title ?? ""),
    shop_name: String(notification.payload?.shop_name ?? ""),
    explorer_name: String(notification.payload?.explorer_name ?? ""),
    beans: String(notification.payload?.beans ?? ""),
  };
  const base = `notificationTypes.${notification.type}`;

  return {
    title: t(`${base}.title`, vars),
    body: notification.body ? t(`${base}.body`, vars) : t(`${base}.body`, vars),
  };
}
