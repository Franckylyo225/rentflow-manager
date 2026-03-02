import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, Clock, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const FILTER_OPTIONS = [
  { value: "all", label: "Toutes", icon: Bell },
  { value: "late", label: "Retards", icon: AlertTriangle },
  { value: "partial", label: "Partiels", icon: Clock },
  { value: "paid", label: "Encaissés", icon: CheckCircle2 },
  { value: "info", label: "Info", icon: Bell },
] as const;

const ICON_MAP: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  late: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  partial: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  paid: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  info: { icon: Bell, color: "text-primary", bg: "bg-primary/10" },
};

export default function Notifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  const counts = {
    all: notifications.length,
    late: notifications.filter(n => n.type === "late").length,
    partial: notifications.filter(n => n.type === "partial").length,
    paid: notifications.filter(n => n.type === "paid").length,
    info: notifications.filter(n => n.type === "info").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setFilter(opt.value)}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
              {counts[opt.value as keyof typeof counts] > 0 && (
                <Badge variant={filter === opt.value ? "secondary" : "outline"} className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                  {counts[opt.value as keyof typeof counts]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filter === "all" ? "Historique complet" : `Notifications — ${FILTER_OPTIONS.find(o => o.value === filter)?.label}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                Aucune notification{filter !== "all" ? " de ce type" : ""}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(n => {
                  const { icon: Icon, color, bg } = ICON_MAP[n.type] || ICON_MAP.info;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30",
                        !n.is_read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("mt-0.5 p-2 rounded-lg", bg, color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (!n.is_read) markAsRead.mutate(n.id);
                          if (n.reference_type === "rent_payment") navigate("/rents");
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm text-foreground", !n.is_read && "font-semibold")}>{n.title}</p>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(new Date(n.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                          {" · "}
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.is_read && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markAsRead.mutate(n.id)}>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotification.mutate(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
