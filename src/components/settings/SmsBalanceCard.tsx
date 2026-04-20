import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, RefreshCw, Loader2, AlertTriangle, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useProfile } from "@/hooks/useProfile";

interface BalanceData {
  creditAvailable: number;
  creditUsed: number;
  lastUpdate: string | null;
}

export function SmsBalanceCard() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeError } = await supabase.functions.invoke("monsms-balance", { body: {} });
      if (invokeError) throw invokeError;
      if (!res?.success) throw new Error(res?.error || "Erreur inconnue");
      setData({
        creditAvailable: res.creditAvailable ?? 0,
        creditUsed: res.creditUsed ?? 0,
        lastUpdate: res.lastUpdate ?? null,
      });
    } catch (err: any) {
      setError(err.message || "Impossible de récupérer le solde");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const isLow = data && data.creditAvailable < 50;
  const isCritical = data && data.creditAvailable < 10;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCritical ? "bg-destructive/10" : isLow ? "bg-warning/10" : "bg-primary/10"}`}>
              <Wallet className={`h-4 w-4 ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-primary"}`} />
            </div>
            <div>
              <CardTitle className="text-base">Crédit SMS MonSMS Pro</CardTitle>
              <CardDescription>Solde restant sur votre compte</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchBalance} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erreur de récupération</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div>
                <p className={`text-4xl font-bold tracking-tight ${isCritical ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>
                  {data.creditAvailable.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">crédits disponibles</p>
              </div>
              {(isLow || isCritical) && (
                <Badge variant="outline" className={isCritical ? "border-destructive/30 text-destructive bg-destructive/5" : "border-warning/30 text-warning bg-warning/5"}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {isCritical ? "Crédit critique" : "Crédit bas"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                <span><strong className="text-foreground">{data.creditUsed}</strong> SMS utilisés aujourd'hui</span>
              </div>
              {data.lastUpdate && (
                <span>· MAJ {format(new Date(data.lastUpdate), "dd MMM HH:mm", { locale: fr })}</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              1 crédit = 1 SMS (160 caractères). Pour recharger, connectez-vous à votre espace MonSMS Pro.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
