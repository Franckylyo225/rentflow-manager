import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, CreditCard, Home, Mail, Phone, User, Loader2, LogOut, Building2, FileText } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeaseTerminationDialog } from "@/components/tenant/LeaseTerminationDialog";

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTermination, setShowTermination] = useState(false);

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      supabase.from("tenants").select("*, units(name, property_id, properties(name, city_id, cities(name)))").eq("id", id).single(),
      supabase.from("rent_payments").select("*").eq("tenant_id", id).order("due_date", { ascending: false }),
    ]).then(([tRes, pRes]) => {
      setTenant(tRes.data);
      setPayments(pRes.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  if (!tenant) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Locataire introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/tenants")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </AppLayout>
    );
  }

  const leaseEnd = new Date(tenant.lease_start);
  leaseEnd.setMonth(leaseEnd.getMonth() + tenant.lease_duration);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tenants")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {tenant.tenant_type === "company" ? tenant.company_name || tenant.full_name : tenant.full_name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {tenant.tenant_type === "company" && <Badge variant="outline" className="mr-2 text-xs">Entreprise</Badge>}
              {tenant.units?.properties?.name} · {tenant.units?.name}
            </p>
          </div>
          {tenant.is_active && (
            <Button variant="destructive" size="sm" onClick={() => setShowTermination(true)}>
              <LogOut className="h-4 w-4 mr-2" /> Initier fin de bail
            </Button>
          )}
          {!tenant.is_active && (
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">Ancien locataire</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {tenant.phone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {tenant.email || "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-3.5 w-3.5" /> {tenant.id_number || "—"}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" /> Détails du bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Début</span><span className="font-medium text-card-foreground">{new Date(tenant.lease_start).toLocaleDateString("fr-FR")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fin</span><span className="font-medium text-card-foreground">{leaseEnd.toLocaleDateString("fr-FR")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Durée</span><span className="font-medium text-card-foreground">{tenant.lease_duration} mois</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Loyer</span><span className="font-medium text-card-foreground">{tenant.rent.toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Caution</span><span className="font-medium text-card-foreground">{tenant.deposit.toLocaleString()} FCFA</span></div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Résumé paiements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total dû</span><span className="font-medium text-card-foreground">{payments.reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total payé</span><span className="font-medium text-success">{payments.reduce((s: number, p: any) => s + p.paid_amount, 0).toLocaleString()} FCFA</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Impayés</span><span className="font-medium text-destructive">{payments.reduce((s: number, p: any) => s + (p.amount - p.paid_amount), 0).toLocaleString()} FCFA</span></div>
            </CardContent>
          </Card>
        </div>

        {payments.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historique des paiements</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Période</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Montant</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Payé</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3 px-4 text-card-foreground">{new Date(p.due_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</td>
                        <td className="py-3 px-4 text-right font-medium text-card-foreground">{p.amount.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-right text-muted-foreground hidden sm:table-cell">{p.paid_amount.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-center"><PaymentStatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        {tenant.is_active && (
          <LeaseTerminationDialog
            open={showTermination}
            onOpenChange={setShowTermination}
            tenant={tenant}
            payments={payments}
            onComplete={() => navigate("/tenants")}
          />
        )}
      </div>
    </AppLayout>
  );
}
