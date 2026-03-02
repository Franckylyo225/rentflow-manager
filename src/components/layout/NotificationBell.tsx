import { useState, useMemo } from "react";
import { Bell, AlertTriangle, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRentPayments } from "@/hooks/useData";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "late" | "partial" | "paid";
  title: string;
  description: string;
  date: string;
  icon: typeof AlertTriangle;
  color: string;
}

export function NotificationBell() {
  const { data: payments } = useRentPayments();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);

  const notifications = useMemo<Notification[]>(() => {
    const now = new Date().toISOString().slice(0, 7);
    const items: Notification[] = [];

    // Late payments this month
    payments
      .filter(p => p.month === now && p.status === "late")
      .forEach(p => {
        items.push({
          id: `late-${p.id}`,
          type: "late",
          title: "Loyer en retard",
          description: `${p.tenants?.full_name} — ${(p.amount - p.paid_amount).toLocaleString()} FCFA`,
          date: p.due_date,
          icon: AlertTriangle,
          color: "text-destructive",
        });
      });

    // Partial payments this month
    payments
      .filter(p => p.month === now && p.status === "partial")
      .forEach(p => {
        items.push({
          id: `partial-${p.id}`,
          type: "partial",
          title: "Paiement partiel",
          description: `${p.tenants?.full_name} — ${p.paid_amount.toLocaleString()} / ${p.amount.toLocaleString()} FCFA`,
          date: p.due_date,
          icon: Clock,
          color: "text-warning",
        });
      });

    // Recent paid payments (last 5)
    payments
      .filter(p => p.month === now && p.status === "paid")
      .slice(0, 5)
      .forEach(p => {
        items.push({
          id: `paid-${p.id}`,
          type: "paid",
          title: "Loyer encaissé",
          description: `${p.tenants?.full_name} — ${p.paid_amount.toLocaleString()} FCFA`,
          date: p.due_date,
          icon: CheckCircle2,
          color: "text-success",
        });
      });

    return items.sort((a, b) => {
      const order = { late: 0, partial: 1, paid: 2 };
      return order[a.type] - order[b.type];
    });
  }, [payments]);

  const urgentCount = notifications.filter(n => n.type === "late" || n.type === "partial").length;
  const unseenCount = Math.max(0, urgentCount - seenCount);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) setSeenCount(urgentCount);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unseenCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unseenCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          {urgentCount > 0 && (
            <span className="text-xs text-muted-foreground">{urgentCount} alerte{urgentCount > 1 ? "s" : ""}</span>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              Aucune notification
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => { setOpen(false); navigate("/rents"); }}
                  >
                    <div className={cn("mt-0.5 p-1.5 rounded-lg bg-muted", n.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); navigate("/rents"); }}>
              Voir tous les loyers
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
