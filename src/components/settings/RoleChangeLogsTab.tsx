import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, ArrowRight, UserPlus, UserMinus, Pencil, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RoleLog {
  id: string;
  target_user_id: string;
  target_user_name: string | null;
  target_user_email: string | null;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  action: "created" | "updated" | "deleted";
  old_role: string | null;
  new_role: string | null;
  created_at: string;
}

const ACTION_CONFIG = {
  created: { label: "Création", icon: UserPlus, color: "bg-green-500/15 text-green-600 border-green-500/30" },
  updated: { label: "Modification", icon: Pencil, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  deleted: { label: "Suppression", icon: UserMinus, color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  gestionnaire: "Gestionnaire",
  comptable: "Comptable",
};

export function RoleChangeLogsTab() {
  const [logs, setLogs] = useState<RoleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("role_change_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) setLogs(data as RoleLog[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><History className="h-4 w-4 text-purple-500" /></div>
          <div>
            <CardTitle className="text-base">Journal des changements de rôles</CardTitle>
            <CardDescription>{logs.length} entrée{logs.length > 1 ? "s" : ""} — accès super admin uniquement</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Aucun changement enregistré</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => {
              const cfg = ACTION_CONFIG[log.action];
              const Icon = cfg.icon;
              const oldLabel = log.old_role ? (ROLE_LABELS[log.old_role] || log.old_role) : null;
              const newLabel = log.new_role ? (ROLE_LABELS[log.new_role] || log.new_role) : null;

              return (
                <div key={log.id} className="px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Badge variant="outline" className={`${cfg.color} gap-1 flex-shrink-0`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </Badge>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm text-card-foreground">
                          <span className="font-medium">{log.target_user_name || "Utilisateur supprimé"}</span>
                          {log.target_user_email && (
                            <span className="text-muted-foreground"> · {log.target_user_email}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {log.action === "updated" && oldLabel && newLabel ? (
                            <>
                              <Badge variant="secondary" className="text-[11px]">{oldLabel}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <Badge className="text-[11px] bg-primary/15 text-primary border-primary/30 gap-1">
                                {log.new_role === "super_admin" && <Crown className="h-3 w-3" />}
                                {newLabel}
                              </Badge>
                            </>
                          ) : log.action === "created" && newLabel ? (
                            <Badge className="text-[11px] bg-green-500/15 text-green-600 border-green-500/30">{newLabel}</Badge>
                          ) : log.action === "deleted" && oldLabel ? (
                            <Badge variant="secondary" className="text-[11px] line-through">{oldLabel}</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Par <span className="font-medium text-card-foreground">{log.changed_by_name || "Système"}</span>
                          {log.changed_by_email && ` (${log.changed_by_email})`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
