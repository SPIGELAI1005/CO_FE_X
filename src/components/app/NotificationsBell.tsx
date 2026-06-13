import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUser } from "@/hooks/use-user";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/queries/notifications";

export function NotificationsBell() {
  const { user } = useUser();
  const { data: items = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAllRead = useMarkAllNotificationsRead(user?.id);
  const [open, setOpen] = useState(false);

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-zinc-100" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-600" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs text-amber-700 inline-flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">No notifications yet.</div>
          ) : (
            items.map((n) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{n.title}</div>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />}
                  </div>
                  {n.body && <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-zinc-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
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
                  className="block px-4 py-3 border-b last:border-0 hover:bg-zinc-50"
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={n.id}
                  onClick={() => markRead.mutate(n.id)}
                  className="text-left w-full px-4 py-3 border-b last:border-0 hover:bg-zinc-50"
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
