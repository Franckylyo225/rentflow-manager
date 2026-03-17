import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
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
const formatAmount = (v: number, short: boolean) => {
  if (short) {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toLocaleString();
  }
  return v.toLocaleString();
};

const STATUS_COLORS: Record<string, string> = {
  paid: "hsl(160, 84%, 39%)",
  late: "hsl(0, 72%, 51%)",
  partial: "hsl(38, 92%, 50%)",
  pending: "hsl(220, 10%, 70%)",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Payé",
  partial: "Partiel",
  late: "En retard",
  pending: "En attente",
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
  const { profile } = useProfile();
  const { data: properties, loading: pLoading } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const { data: expenses } = useExpenses();

  const isMobile = useIsMobile();
  const short = isMobile;

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

  // Sparkline data - last 6 months revenue
  const sparklineData = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(selectedMonth, -i));
    return months.map(m => payments.filter(p => p.month === m).reduce((s, p) => s + p.paid_amount, 0));
  }, [payments, selectedMonth]);

  const sparklineExpenses = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(selectedMonth, -i));
    return months.map(m => expenses.filter(e => e.expense_date.slice(0, 7) === m).reduce((s, e) => s + e.amount, 0));
  }, [expenses, selectedMonth]);

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

  const totalStatusCount = statusData.reduce((s, d) => s + d.count, 0);

  if (pLoading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
                const firstName = profile?.full_name?.split(" ")[0] || "";
                return `${greeting}${firstName ? `, ${firstName}` : ""} 👋`;
              })()}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre portefeuille immobilier</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setSelectedMonth(now)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isCurrentMonth ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                {formatMonthLabel(selectedMonth)}
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))} disabled={isCurrentMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards - Databrain style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="CA du mois"
            value={`${formatAmount(monthCA, short)} FCFA`}
            icon={TrendingUp}
            variant="success"
            trend={caChange.direction !== "flat" ? { value: `${caChange.pct}%`, positive: caChange.direction === "up" } : undefined}
            subtitle="vs mois précédent"
            sparkData={sparklineData}
          />
          <StatCard
            title="Dépenses"
            value={`${formatAmount(monthExpenses, short)} FCFA`}
            icon={TrendingDown}
            variant="destructive"
            trend={expChange.direction !== "flat" ? { value: `${expChange.pct}%`, positive: expChange.direction === "down" } : undefined}
            subtitle="vs mois précédent"
            sparkData={sparklineExpenses}
          />
          <StatCard
            title="Taux d'occupation"
            value={`${occupancyRate}%`}
            icon={Users}
            variant="info"
            subtitle={`${occupiedUnits}/${totalUnits} unités`}
            sparkData={[60, 65, 70, 72, 75, occupancyRate]}
          />
          <StatCard
            title="Biens gérés"
            value={properties.length.toString()}
            icon={Building2}
            variant="default"
            subtitle={`${totalUnits} unités · ${tenants.length} locataires`}
          />
        </div>

        {/* Financial summary banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className="p-3 rounded-xl bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Loyers attendus</p>
                <p className="text-xl font-bold text-card-foreground">{formatAmount(totalRevenue, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Impayés</p>
                <p className="text-xl font-bold text-destructive">{formatAmount(unpaidTotal, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-border overflow-hidden relative")}>
            <div className={cn("absolute inset-0 bg-gradient-to-br", monthBenefice >= 0 ? "from-success/5 to-transparent" : "from-destructive/5 to-transparent")} />
            <CardContent className="p-4 flex items-center gap-4 relative">
              <div className={cn("p-3 rounded-xl", monthBenefice >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                <Wallet className={cn("h-5 w-5", monthBenefice >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bénéfice net</p>
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-xl font-bold", monthBenefice >= 0 ? "text-success" : "text-destructive")}>{formatAmount(monthBenefice, short)} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                  <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", benChange.direction === "up" ? "text-success" : benChange.direction === "down" ? "text-destructive" : "text-muted-foreground")}>
                    {benChange.direction === "up" ? <ArrowUpRight className="h-3 w-3" /> : benChange.direction === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {benChange.pct}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {properties.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Bienvenue sur SCI Binieba</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Commencez par ajouter vos biens immobiliers dans la section "Biens" pour voir apparaître vos données ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts row - Status Analysis & Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Payment status donut - Databrain style */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    Analyse des statuts
                    <span className="text-muted-foreground text-xs font-normal">({formatMonthLabel(selectedMonth)})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="relative flex-shrink-0">
                        <ResponsiveContainer width={200} height={200}>
                          <PieChart>
                            <Pie
                              data={statusData}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              strokeWidth={0}
                            >
                              {statusData.map((entry) => (
                                <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number, name: string) => [`${v} loyer(s)`, name]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 90%)", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold text-card-foreground">{totalStatusCount}</span>
                          <span className="text-xs text-muted-foreground">Loyers</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        {statusData.map(s => {
                          const pct = Math.round((s.count / totalStatusCount) * 100);
                          return (
                            <div key={s.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.key] }} />
                                  <span className="text-sm text-card-foreground font-medium">{s.name}</span>
                                </div>
                                <span className="text-sm font-bold text-card-foreground">{s.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s.key] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly revenue bar chart - Databrain style */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                        Payé
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-destructive" />
                        Impayé
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {monthlyData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyData} barGap={2} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={FCFA} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip
                          formatter={(value: number) => `${value.toLocaleString()} FCFA`}
                          contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 90%)", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        />
                        <Bar dataKey="paid" name="Payé" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="unpaid" name="Impayé" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transactions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Paiements du mois</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {monthPayments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Aucun paiement pour ce mois</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Locataire</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Montant</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Échéance</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthPayments.slice(0, 10).map(p => (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-card-foreground">{p.tenants?.full_name}</p>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-card-foreground">{p.paid_amount.toLocaleString()} / {p.amount.toLocaleString()} FCFA</td>
                            <td className="py-3 px-4 text-center text-muted-foreground">{new Date(p.due_date).toLocaleDateString("fr-FR")}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={cn(
                                "text-xs font-medium px-2.5 py-1 rounded-full",
                                p.status === "paid" ? "bg-success/10 text-success" :
                                p.status === "late" ? "bg-destructive/10 text-destructive" :
                                p.status === "partial" ? "bg-warning/10 text-warning" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {STATUS_LABELS[p.status] || p.status}
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
