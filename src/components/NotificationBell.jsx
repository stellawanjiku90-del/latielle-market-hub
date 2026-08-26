import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useNotifications from "@/hooks/useNotifications";

export default function NotificationBell({ recipient }) {
  const { notifications, unreadCount, markAllRead } = useNotifications(recipient);

  return (
    <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markAllRead(); }}>
      <DropdownMenuTrigger className="relative outline-none">
        <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 font-body p-0 max-h-96 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && <Badge variant="destructive" className="text-[10px]">{unreadCount} new</Badge>}
        </div>
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border/50 last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${n.type === "warning" ? "bg-destructive" : !n.is_read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}