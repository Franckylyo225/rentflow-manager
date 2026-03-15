import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent: { label: "Envoyé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  DeliveredToTerminal: { label: "Livré", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  DeliveredToNetwork: { label: "Réseau OK", icon: AlertCircle, className: "bg-warning/10 text-warning border-warning/20" },
  DeliveryUncertain: { label: "Statut incertain", icon: AlertCircle, className: "bg-warning/10 text-warning border-warning/20" },
  MessageWaiting: { label: "En file", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  DeliveryImpossible: { label: "Non livré", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  before_5: "Rappel J-5",
  after_1: "Relance J+1",
  after_7: "Relance J+7",
};

export function SmsHistoryTable() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const syncDeliveryStatuses = async () => {
    if (!user) return;
    await supabase.functions.invoke("sync-sms-delivery", { body: {} });
  };

  const fetchHistory = async (withSync = true) => {
    if (!user) return;
    setLoading(true);

    if (withSync) {
      await syncDeliveryStatuses();
    }

    const { data } = await supabase
      .from("sms_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory(true);
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Historique des SMS</CardTitle>
              <CardDescription>{history.length} message{history.length > 1 ? "s" : ""} envoyé{history.length > 1 ? "s" : ""}</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchHistory(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun SMS envoyé pour le moment.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sms) => {
                  const statusConf = STATUS_CONFIG[sms.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConf.icon;

                  return (
                    <TableRow key={sms.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(sms.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div>
                          {sms.recipient_name && <p className="text-sm font-medium">{sms.recipient_name}</p>}
                          <p className="text-xs text-muted-foreground">{sms.recipient_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[250px]" title={sms.message}>{sms.message}</p>
                      </TableCell>
                      <TableCell>
                        {sms.template_key ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {TEMPLATE_LABELS[sms.template_key] || sms.template_key}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Test</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 text-xs font-normal ${statusConf.className}`}>
                          <StatusIcon className="h-3 w-3" /> {statusConf.label}
                        </Badge>
                        {sms.error_message && (
                          <p className="text-[10px] text-destructive mt-1 truncate max-w-[150px]" title={sms.error_message}>
                            {sms.error_message}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
