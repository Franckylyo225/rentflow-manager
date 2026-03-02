import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, AlertTriangle, TrendingUp, Home, Loader2, Wallet, TrendingDown, ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";
import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number): string {
  const d = new Date(month + "-01");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}

export default function Dashboard() {
  const { data: properties, loading: pLoading } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const { data: expenses } = useExpenses();

  const now = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(now);
  const isCurrentMonth = selectedMonth === now;

  // Financial KPIs for selected month
  const prevMonth = useMemo(() => shiftMonth(selectedMonth, -1), [selectedMonth]);
  const monthCA = useMemo(() => payments.filter(p => p.month === selectedMonth).reduce((s, p) => s + p.paid_amount, 0), [payments, selectedMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.expense_date.slice(0, 7) === selectedMonth).reduce((s, e) => s + e.amount, 0), [expenses, selectedMonth]);
  const monthBenefice = monthCA - monthExpenses;

  // Previous month KPIs for comparison
  const prevCA = useMemo(() => payments.filter(p => p.month === prevMonth).reduce((s, p) => s + p.paid_amount, 0), [payments, prevMonth]);
  const prevExpenses = useMemo(() => expenses.filter(e => e.expense_date.slice(0, 7) === prevMonth).reduce((s, e) => s + e.amount, 0), [expenses, prevMonth]);
  const prevBenefice = prevCA - prevExpenses;

  function pctChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
    if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
    if (previous === 0) return { pct: 100, direction: "up" };
    const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
    return { pct: Math.abs(pct), direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  }

  const caChange = pctChange(monthCA, prevCA);
  const expChange = pctChange(monthExpenses, prevExpenses);
  const benChange = pctChange(monthBenefice, prevBenefice);

  // Filtered payments & unpaid for selected month
  const monthPayments = useMemo(() => payments.filter(p => p.month === selectedMonth), [payments, selectedMonth]);
  const unpaidTotal = useMemo(() => monthPayments.filter(r => r.status !== "paid").reduce((sum, r) => sum + (r.amount - r.paid_amount), 0), [monthPayments]);
  const totalRevenue = useMemo(() => monthPayments.reduce((s, p) => s + p.amount, 0), [monthPayments]);

  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

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
        isSelected: d.month === selectedMonth,
      }));
  }, [payments, selectedMonth]);

  // Revenue by city for selected month
  const cityData = useMemo(() => {
    const tenantsByUnit: Record<string, boolean> = {};
    monthPayments.forEach(p => {
      const tenant = tenants.find(t => t.id === p.tenant_id);
      if (tenant) tenantsByUnit[tenant.unit_id] = true;
    });
    const byCity: Record<string, { city: string; revenue: number }> = {};
    units.filter(u => tenantsByUnit[u.id]).forEach(u => {
      const prop = properties.find(p => p.id === u.property_id);
      const cityName = prop?.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, revenue: 0 };
      byCity[cityName].revenue += u.rent;
    });
    return Object.values(byCity).sort((a, b) => b.revenue - a.revenue);
  }, [monthPayments, units, properties, tenants]);

  // Payment status breakdown for selected month
  const statusData = useMemo(() => {
    if (monthPayments.length === 0) return [];
    return buildStatusData(monthPayments);
  }, [monthPayments]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Tableau de bord</h1>
            <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
          </div>
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={() => setSelectedMonth(now)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isCurrentMonth ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {formatMonthLabel(selectedMonth)}
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))} disabled={isCurrentMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Financial summary banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/15">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CA du mois</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-card-foreground">{(monthCA / 1000000).toFixed(1)}M <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", caChange.direction === "up" ? "text-success" : caChange.direction === "down" ? "text-destructive" : "text-muted-foreground")}>
                    {caChange.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : caChange.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {caChange.pct}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-destructive/5 to-destructive/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/15">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dépenses du mois</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-card-foreground">{(monthExpenses / 1000000).toFixed(1)}M <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", expChange.direction === "up" ? "text-destructive" : expChange.direction === "down" ? "text-success" : "text-muted-foreground")}>
                    {expChange.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : expChange.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {expChange.pct}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-border bg-gradient-to-br", monthBenefice >= 0 ? "from-success/5 to-success/10" : "from-destructive/5 to-destructive/10")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", monthBenefice >= 0 ? "bg-success/15" : "bg-destructive/15")}>
                <Wallet className={cn("h-6 w-6", monthBenefice >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bénéfice net</p>
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-2xl font-bold", monthBenefice >= 0 ? "text-success" : "text-destructive")}>{(monthBenefice / 1000000).toFixed(1)}M <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", benChange.direction === "up" ? "text-success" : benChange.direction === "down" ? "text-destructive" : "text-muted-foreground")}>
                    {benChange.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : benChange.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {benChange.pct}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rent & portfolio stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Loyers attendus" value={`${(totalRevenue / 1000000).toFixed(1)}M FCFA`} icon={TrendingUp} variant="success" />
          <StatCard title="Loyers impayés" value={`${(unpaidTotal / 1000000).toFixed(1)}M FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="Taux d'occupation" value={`${occupancyRate}%`} subtitle={`${occupiedUnits}/${totalUnits} unités`} icon={Users} />
          <StatCard title="Nombre de biens" value={properties.length.toString()} icon={Home} subtitle={`${totalUnits} unités · ${tenants.length} locataires`} />
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

              {/* Transactions du mois */}
              <Card className="border-border lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Transactions du mois</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {monthPayments.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">Aucune transaction pour ce mois</div>
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
                          {monthPayments.slice(0, 8).map(p => (
                            <tr key={p.id} className="border-b border-border/50">
                              <td className="py-2.5 px-4">
                                <p className="font-medium text-card-foreground">{p.tenants?.full_name}</p>
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
