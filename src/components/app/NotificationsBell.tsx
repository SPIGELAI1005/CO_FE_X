import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Check, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import { getNotificationDisplay } from "@/lib/notification-display";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "@/lib/queries/notifications";

function NotificationRow({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const display = getNotificationDisplay(notification, t);
  const isUnread = !notification.read_at;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug text-[color:var(--cofex-coffee-deep)]">{display.title}</div>
        {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-600" aria-hidden />}
      </div>
      {display.body && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-600">{display.body}</p>}
      <p className="mt-1.5 text-[10px] text-zinc-400">{new Date(notification.created_at).toLocaleString()}</p>
    </>
  );

  const className = `block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-zinc-50 ${
    isUnread ? "bg-amber-50/40" : ""
  }`;

  if (notification.link) {
    return (
      <Link
        to={notification.link}
        onClick={() => {
          onRead(notification.id);
          onNavigate?.();
        }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onRead(notification.id)} className={className}>
      {content}
    </button>
  );
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: items = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAllRead = useMarkAllNotificationsRead(user?.id);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prefsLink = pathname.startsWith("/partner") ? "/partner/settings" : "/profile";

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 hover:bg-zinc-100" aria-label={t("notifications.ariaLabel")}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold">{t("notifications.title")}</span>
              <p className="mt-0.5 text-[11px] text-zinc-500">{t("notifications.subtitle")}</p>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-700 hover:underline disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> {t("notifications.markAllRead")}
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">{t("notifications.empty")}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("notifications.emptyHint")}</p>
            </div>
          ) : (
            items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={(id) => markRead.mutate(id)}
                onNavigate={() => setOpen(false)}
              />
            ))
          )}
        </div>
        <p className="border-t px-4 py-2 text-center text-[10px] text-zinc-400">
          <Link to={prefsLink} onClick={() => setOpen(false)} className="underline hover:text-zinc-600">
            {t("notificationPrefs.title")}
          </Link>
        </p>
      </PopoverContent>
    </Popover>
  );
}
