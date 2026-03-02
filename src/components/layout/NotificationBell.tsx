import { useState } from "react";
import { Bell, AlertTriangle, CheckCircle2, Clock, CreditCard, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const ICON_MAP: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  late: { icon: AlertTriangle, color: "text-destructive" },
  partial: { icon: Clock, color: "text-warning" },
  paid: { icon: CheckCircle2, color: "text-success" },
  info: { icon: Bell, color: "text-primary" },
};

export function NotificationBell() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = (id: string, isRead: boolean, referenceType?: string | null) => {
    if (!isRead) markAsRead.mutate(id);
    setOpen(false);
    if (referenceType === "rent_payment") navigate("/rents");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const { icon: Icon, color } = ICON_MAP[n.type] || ICON_MAP.info;
                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      !n.is_read && "bg-primary/5"
                    )}
                    onClick={() => handleClick(n.id, n.is_read, n.reference_type)}
                  >
                    <div className={cn("mt-0.5 p-1.5 rounded-lg bg-muted", color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm text-card-foreground", !n.is_read && "font-semibold")}>{n.title}</p>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); navigate("/notifications"); }}>
              Voir tout l'historique
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
