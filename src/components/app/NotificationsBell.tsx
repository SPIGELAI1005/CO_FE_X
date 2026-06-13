import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/queries/notifications";

export function NotificationsBell() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: items = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAllRead = useMarkAllNotificationsRead(user?.id);
  const [open, setOpen] = useState(false);

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 hover:bg-zinc-100" aria-label={t("notifications.ariaLabel")}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-600" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-semibold">{t("notifications.title")}</span>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">{t("notifications.empty")}</div>
          ) : (
            items.map((n) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{n.title}</div>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-600" />}
                  </div>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-zinc-400">{new Date(n.created_at).toLocaleString()}</p>
                </>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link as "/explore"}
                  onClick={() => {
                    markRead.mutate(n.id);
                    setOpen(false);
                  }}
                  className="block border-b px-4 py-3 last:border-0 hover:bg-zinc-50"
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={n.id}
                  onClick={() => markRead.mutate(n.id)}
                  className="w-full border-b px-4 py-3 text-left last:border-0 hover:bg-zinc-50"
                >
                  {body}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
