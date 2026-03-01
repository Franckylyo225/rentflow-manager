import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, AlertTriangle, TrendingUp, Home, Loader2 } from "lucide-react";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { data: properties, loading: pLoading } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalRevenue = units.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);
  const unpaidTotal = payments
    .filter(r => r.status !== "paid")
    .reduce((sum, r) => sum + (r.amount - r.paid_amount), 0);

  if (pLoading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenus mensuels"
            value={`${(totalRevenue / 1000000).toFixed(1)}M FCFA`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Loyers impayés"
            value={`${(unpaidTotal / 1000000).toFixed(1)}M FCFA`}
            icon={AlertTriangle}
            variant="destructive"
          />
          <StatCard
            title="Taux d'occupation"
            value={`${occupancyRate}%`}
            subtitle={`${occupiedUnits}/${totalUnits} unités`}
            icon={Users}
          />
          <StatCard
            title="Nombre de biens"
            value={properties.length.toString()}
            icon={Home}
            subtitle={`${totalUnits} unités · ${tenants.length} locataires`}
          />
        </div>

        {properties.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Bienvenue sur Rentflow</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Commencez par ajouter vos biens immobiliers dans la section "Biens" pour voir apparaître vos données ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Properties summary */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Vos biens</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Bien</th>
                        <th className="text-center py-2.5 px-4 text-muted-foreground font-medium">Unités</th>
                        <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Revenus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.slice(0, 5).map(p => {
                        const propUnits = units.filter(u => u.property_id === p.id);
                        const occ = propUnits.filter(u => u.status === "occupied").length;
                        const rev = propUnits.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);
                        return (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="py-2.5 px-4">
                              <p className="font-medium text-card-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.cities?.name}</p>
                            </td>
                            <td className="py-2.5 px-4 text-center text-card-foreground">{occ}/{propUnits.length}</td>
                            <td className="py-2.5 px-4 text-right text-card-foreground">{rev.toLocaleString()} FCFA</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent payments */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Derniers loyers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Aucun loyer enregistré</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Locataire</th>
                          <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Montant</th>
                          <th className="text-center py-2.5 px-4 text-muted-foreground font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.slice(0, 5).map(p => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="py-2.5 px-4 font-medium text-card-foreground">{p.tenants?.full_name}</td>
                            <td className="py-2.5 px-4 text-right text-card-foreground">{p.amount.toLocaleString()} FCFA</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                p.status === "paid" ? "bg-success/10 text-success" :
                                p.status === "late" ? "bg-destructive/10 text-destructive" :
                                p.status === "partial" ? "bg-warning/10 text-warning" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {p.status === "paid" ? "Payé" : p.status === "late" ? "En retard" : p.status === "partial" ? "Partiel" : "En attente"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
