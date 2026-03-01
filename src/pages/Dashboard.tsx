import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, AlertTriangle, TrendingUp, Home, Loader2, Wallet, TrendingDown } from "lucide-react";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";
import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const FCFA = (v: number) => `${(v / 1000).toFixed(0)}k`;

const STATUS_COLORS: Record<string, string> = {
  paid: "hsl(160, 84%, 39%)",
  late: "hsl(0, 72%, 51%)",
  partial: "hsl(38, 92%, 50%)",
  pending: "hsl(220, 10%, 70%)",
};

const CITY_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(210, 100%, 52%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 72%, 51%)",
  "hsl(190, 70%, 50%)",
];

export default function Dashboard() {
  const { data: properties, loading: pLoading } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const { data: expenses } = useExpenses();

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const totalRevenue = units.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);
  const unpaidTotal = payments
    .filter(r => r.status !== "paid")
    .reduce((sum, r) => sum + (r.amount - r.paid_amount), 0);

  // Financial KPIs
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthCA = useMemo(() => payments.filter(p => p.month === currentMonth).reduce((s, p) => s + p.paid_amount, 0), [payments, currentMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.expense_date.slice(0, 7) === currentMonth).reduce((s, e) => s + e.amount, 0), [expenses, currentMonth]);
  const monthBenefice = monthCA - monthExpenses;

  // Monthly revenue chart data
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { month: string; paid: number; unpaid: number }> = {};
    payments.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { month: p.month, paid: 0, unpaid: 0 };
      byMonth[p.month].paid += p.paid_amount;
      byMonth[p.month].unpaid += (p.amount - p.paid_amount);
    });
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: new Date(d.month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      }));
  }, [payments]);

  // Revenue by city
  const cityData = useMemo(() => {
    const byCity: Record<string, { city: string; revenue: number }> = {};
    units.filter(u => u.status === "occupied").forEach(u => {
      const prop = properties.find(p => p.id === u.property_id);
      const cityName = prop?.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, revenue: 0 };
      byCity[cityName].revenue += u.rent;
    });
    return Object.values(byCity).sort((a, b) => b.revenue - a.revenue);
  }, [units, properties]);

  // Payment status breakdown for current month
  const statusData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentPayments = payments.filter(p => p.month === currentMonth);
    if (currentPayments.length === 0) {
      // Fallback to latest month
      const months = [...new Set(payments.map(p => p.month))].sort().reverse();
      if (months.length > 0) {
        const latest = months[0];
        const latestPayments = payments.filter(p => p.month === latest);
        return buildStatusData(latestPayments);
      }
      return [];
    }
    return buildStatusData(currentPayments);
  }, [payments]);

  function buildStatusData(list: typeof payments) {
    const counts: Record<string, { name: string; value: number; count: number }> = {
      paid: { name: "Payé", value: 0, count: 0 },
      partial: { name: "Partiel", value: 0, count: 0 },
      late: { name: "En retard", value: 0, count: 0 },
      pending: { name: "En attente", value: 0, count: 0 },
    };
    list.forEach(p => {
      if (counts[p.status]) {
        counts[p.status].value += p.amount;
        counts[p.status].count += 1;
      }
    });
    return Object.entries(counts)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) => ({ ...v, key }));
  }

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <StatCard title="Revenus mensuels" value={`${(totalRevenue / 1000000).toFixed(1)}M FCFA`} icon={TrendingUp} variant="success" />
          <StatCard title="Loyers impayés" value={`${(unpaidTotal / 1000000).toFixed(1)}M FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="Taux d'occupation" value={`${occupancyRate}%`} subtitle={`${occupiedUnits}/${totalUnits} unités`} icon={Users} />
          <StatCard title="Nombre de biens" value={properties.length.toString()} icon={Home} subtitle={`${totalUnits} unités · ${tenants.length} locataires`} />
          <StatCard title="CA du mois" value={`${(monthCA / 1000000).toFixed(1)}M`} icon={TrendingUp} variant="success" />
          <StatCard title="Dépenses du mois" value={`${(monthExpenses / 1000000).toFixed(1)}M`} icon={TrendingDown} variant="destructive" />
          <StatCard title="Bénéfice net" value={`${(monthBenefice / 1000000).toFixed(1)}M`} icon={Wallet} variant={monthBenefice >= 0 ? "success" : "destructive"} />
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
          <>
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Monthly revenue bar chart */}
              <Card className="border-border lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={FCFA} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString()} FCFA`}
                          contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 90%)", fontSize: 13 }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="paid" name="Payé" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="unpaid" name="Impayé" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Payment status pie */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Statut des loyers</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                            {statusData.map((entry) => (
                              <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number, name: string) => [`${v} loyer(s)`, name]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 justify-center mt-1">
                        {statusData.map(s => (
                          <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.key] }} />
                            {s.name} ({s.count})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* City revenue + tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Revenue by city */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenus par ville</CardTitle>
                </CardHeader>
                <CardContent>
                  {cityData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      {cityData.map((c, i) => {
                        const max = cityData[0]?.revenue || 1;
                        const pct = Math.round((c.revenue / max) * 100);
                        return (
                          <div key={c.city}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-card-foreground">{c.city}</span>
                              <span className="text-muted-foreground">{c.revenue.toLocaleString()} FCFA</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dernières transactions */}
              <Card className="border-border lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Dernières transactions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">Aucune transaction</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Locataire</th>
                            <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Bien</th>
                            <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Montant</th>
                            <th className="text-center py-2.5 px-4 text-muted-foreground font-medium">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.slice(0, 6).map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="py-2.5 px-4">
                                <p className="font-medium text-card-foreground">{p.tenants?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{p.month}</p>
                              </td>
                              <td className="py-2.5 px-4">
                                <p className="text-card-foreground">{p.tenants?.units?.properties?.name}</p>
                                <p className="text-xs text-muted-foreground">{p.tenants?.units?.name}</p>
                              </td>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
