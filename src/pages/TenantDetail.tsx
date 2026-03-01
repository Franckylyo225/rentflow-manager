import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { tenants, rentPayments } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CreditCard, Home, Mail, Phone, User } from "lucide-react";
import { PaymentStatusBadge } from "@/components/ui/status-badge";

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const tenant = tenants.find(t => t.id === id);
  const payments = rentPayments.filter(r => r.tenantId === id);

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

  const leaseEnd = new Date(tenant.leaseStart);
  leaseEnd.setMonth(leaseEnd.getMonth() + tenant.leaseDuration);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tenants")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{tenant.fullName}</h1>
              <Badge variant="outline" className={
                tenant.paymentStatus === "up_to_date"
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }>
                {tenant.paymentStatus === "up_to_date" ? "À jour" : "En retard"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{tenant.propertyName} · {tenant.unitName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal info */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {tenant.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {tenant.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" /> {tenant.idNumber}
              </div>
            </CardContent>
          </Card>

          {/* Lease details */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" /> Détails du bail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Début</span>
                <span className="font-medium text-card-foreground">{new Date(tenant.leaseStart).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fin</span>
                <span className="font-medium text-card-foreground">{leaseEnd.toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Durée</span>
                <span className="font-medium text-card-foreground">{tenant.leaseDuration} mois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loyer</span>
                <span className="font-medium text-card-foreground">{tenant.rent.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caution</span>
                <span className="font-medium text-card-foreground">{tenant.deposit.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment summary */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Résumé paiements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total dû</span>
                <span className="font-medium text-card-foreground">{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total payé</span>
                <span className="font-medium text-success">{payments.reduce((s, p) => s + p.paidAmount, 0).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impayés</span>
                <span className="font-medium text-destructive">
                  {payments.reduce((s, p) => s + (p.amount - p.paidAmount), 0).toLocaleString()} FCFA
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment history */}
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
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Date paiement</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-3 px-4 text-card-foreground">{new Date(p.dueDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</td>
                      <td className="py-3 px-4 text-right font-medium text-card-foreground">{p.amount.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-right text-muted-foreground hidden sm:table-cell">{p.paidAmount.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{p.paidDate ? new Date(p.paidDate).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="py-3 px-4 text-center"><PaymentStatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
