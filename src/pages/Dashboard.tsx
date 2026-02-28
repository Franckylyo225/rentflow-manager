import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, MapPin } from "lucide-react";
import { properties, tenants, rentPayments, monthlyRevenue, revenueByCity, units, cities } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PaymentStatusBadge } from "@/components/ui/status-badge";

export default function Dashboard() {
  const totalRevenue = properties.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100);
  const unpaidTotal = rentPayments
    .filter(r => r.status === "late" || r.status === "partial" || r.status === "pending")
    .reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);
  const recentPayments = rentPayments.slice(0, 6);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenus mensuels"
            value={`${(totalRevenue / 1000000).toFixed(1)}M FCFA`}
            icon={TrendingUp}
            trend={{ value: "+12% vs mois dernier", positive: true }}
            variant="success"
          />
          <StatCard
            title="Taux d'occupation"
            value={`${occupancyRate}%`}
            subtitle={`${occupiedUnits}/${totalUnits} unités`}
            icon={Building2}
          />
          <StatCard
            title="Locataires actifs"
            value={tenants.length.toString()}
            icon={Users}
            subtitle={`${cities.length} villes`}
          />
          <StatCard
            title="Loyers impayés"
            value={`${(unpaidTotal / 1000000).toFixed(1)}M FCFA`}
            icon={AlertTriangle}
            variant="destructive"
            trend={{ value: "3 locataires concernés", positive: false }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `${v / 1000000}M`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`, "Revenus"]} />
                  <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenus par ville</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={revenueByCity} dataKey="revenue" nameKey="city" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3}>
                    {revenueByCity.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {revenueByCity.map(c => (
                  <div key={c.city} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.fill }} />
                      <span className="text-muted-foreground">{c.city}</span>
                    </div>
                    <span className="font-medium text-card-foreground">{c.revenue.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent payments */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Derniers loyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Locataire</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium hidden sm:table-cell">Bien</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Montant</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Échéance</th>
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-card-foreground">{p.tenantName}</td>
                      <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">{p.propertyName}</td>
                      <td className="py-2.5 px-3 text-card-foreground">{p.amount.toLocaleString()} FCFA</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{new Date(p.dueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="py-2.5 px-3"><PaymentStatusBadge status={p.status} /></td>
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
