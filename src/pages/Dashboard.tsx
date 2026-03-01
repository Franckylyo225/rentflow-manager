import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Home } from "lucide-react";
import { properties, tenants, rentPayments, monthlyRevenue, revenueByCity, units } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Dashboard() {
  const totalRevenue = properties.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = Math.round((occupiedUnits / totalUnits) * 100);
  const unpaidTotal = rentPayments
    .filter(r => r.status === "late" || r.status === "partial" || r.status === "pending")
    .reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenus du mois"
            value={`${(totalRevenue / 1000000).toFixed(1)}M FCFA`}
            icon={TrendingUp}
            trend={{ value: "+12% vs mois dernier", positive: true }}
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
            subtitle={`${units.length} unités`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly revenue curve */}
          <Card className="lg:col-span-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `${v / 1000000}M`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`]} />
                  <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue by city */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Répartition par ville</CardTitle>
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

        {/* Paid vs Late histogram */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Loyers payés vs en retard</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" tickFormatter={v => `${v / 1000000}M`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} FCFA`]} />
                <Legend />
                <Bar dataKey="paid" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Payés" />
                <Bar dataKey="late" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="En retard" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
