import type { TFunction } from "i18next";

export interface NotificationDisplayInput {
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
}

export function notificationDisplayVars(payload: Record<string, unknown> | null) {
  const p = payload ?? {};
  return {
    business_name: String(p.business_name ?? ""),
    crawl_title: String(p.crawl_title ?? p.title ?? ""),
    shop_name: String(p.shop_name ?? ""),
    explorer_name: String(p.explorer_name ?? ""),
    beans: String(p.beans ?? ""),
    campaign_title: String(p.campaign_title ?? p.title ?? ""),
    code: String(p.code ?? ""),
    remaining: String(p.remaining ?? ""),
    check_ins: String(p.check_ins ?? ""),
    redemptions: String(p.redemptions ?? ""),
    social_proofs: String(p.social_proofs ?? ""),
    badge_name: String(p.name ?? ""),
  };
}

export function getNotificationDisplay(
  notification: NotificationDisplayInput,
  t: TFunction,
): { title: string; body: string | null } {
  const base = `notificationTypes.${notification.type}`;
  const vars = notificationDisplayVars(notification.payload);

  return {
    title: t(`${base}.title`, { defaultValue: notification.title, ...vars }),
    body: t(`${base}.body`, { defaultValue: notification.body ?? "", ...vars }) || notification.body,
  };
}
