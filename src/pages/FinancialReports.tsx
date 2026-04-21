import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { useRentPayments, useProperties, useCities } from "@/hooks/useData";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, Percent, Loader2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const FCFA = (v: number) => `${(v / 1000).toFixed(0)}k`;
const CATEGORY_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)", "hsl(190, 70%, 50%)",
  "hsl(330, 70%, 55%)", "hsl(120, 60%, 40%)", "hsl(50, 80%, 50%)",
];

export default function FinancialReports() {
  const { user } = useAuth();
  const { data: expenses, loading: expLoading } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: payments, loading: payLoading } = useRentPayments();
  const { data: properties } = useProperties();
  const { data: cities } = useCities();
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setSalesLoading(true);
    supabase
      .from("patrimony_assets")
      .select("id, title, sale_price, sale_commission, sale_date, buyer_name")
      .eq("status", "sold")
      .not("sale_date", "is", null)
      .then(({ data }) => {
        setSales(data || []);
        setSalesLoading(false);
      });
  }, [user]);

  const loading = expLoading || payLoading || salesLoading;

  // Net sale revenue = price - commission
  const saleNet = (s: any) => (s.sale_price || 0) - (s.sale_commission || 0);
  const saleMonth = (s: any) => (s.sale_date || "").slice(0, 7);

  // Filter by period
  const filteredPayments = useMemo(() => {
    if (periodFilter === "all") return payments;
    return payments.filter(p => p.month === periodFilter);
  }, [payments, periodFilter]);

  const filteredExpenses = useMemo(() => {
    if (periodFilter === "all") return expenses;
    return expenses.filter(e => e.expense_date.slice(0, 7) === periodFilter);
  }, [expenses, periodFilter]);

  const months = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => set.add(p.month));
    expenses.forEach(e => set.add(e.expense_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [payments, expenses]);

  // KPIs
  const ca = useMemo(() => filteredPayments.reduce((s, p) => s + p.paid_amount, 0), [filteredPayments]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const benefice = ca - totalExpenses;
  const marge = ca > 0 ? Math.round((benefice / ca) * 100) : 0;

  // CA vs Dépenses par mois
  const monthlyComparison = useMemo(() => {
    const byMonth: Record<string, { month: string; ca: number; depenses: number }> = {};
    payments.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { month: p.month, ca: 0, depenses: 0 };
      byMonth[p.month].ca += p.paid_amount;
    });
    expenses.forEach(e => {
      const m = e.expense_date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { month: m, ca: 0, depenses: 0 };
      byMonth[m].depenses += e.amount;
    });
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({
        ...d,
        label: new Date(d.month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        benefice: d.ca - d.depenses,
      }));
  }, [payments, expenses]);

  // Dépenses par catégorie
  const categoryData = useMemo(() => {
    const byCategory: Record<string, { name: string; value: number }> = {};
    filteredExpenses.forEach(e => {
      const catName = e.expense_categories?.name || "Autre";
      if (!byCategory[catName]) byCategory[catName] = { name: catName, value: 0 };
      byCategory[catName].value += e.amount;
    });
    return Object.values(byCategory).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Bénéfice par ville
  const cityProfitData = useMemo(() => {
    const byCity: Record<string, { city: string; ca: number; depenses: number }> = {};
    // CA by city
    filteredPayments.forEach(p => {
      const cityName = p.tenants?.units?.properties?.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, ca: 0, depenses: 0 };
      byCity[cityName].ca += p.paid_amount;
    });
    // Expenses by city
    filteredExpenses.forEach(e => {
      const cityName = e.cities?.name || "Autre";
      if (!byCity[cityName]) byCity[cityName] = { city: cityName, ca: 0, depenses: 0 };
      byCity[cityName].depenses += e.amount;
    });
    return Object.values(byCity).map(c => ({
      ...c,
      benefice: c.ca - c.depenses,
    })).sort((a, b) => b.benefice - a.benefice);
  }, [filteredPayments, filteredExpenses]);

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Rapports financiers</h1>
            <p className="text-muted-foreground text-sm mt-1">Performance financière globale</p>
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Période" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Chiffre d'affaires" value={`${(ca / 1000000).toFixed(1)}M FCFA`} icon={TrendingUp} variant="success" />
          <StatCard title="Dépenses" value={`${(totalExpenses / 1000000).toFixed(1)}M FCFA`} icon={TrendingDown} variant="destructive" />
          <StatCard title="Bénéfice net" value={`${(benefice / 1000000).toFixed(1)}M FCFA`} icon={Wallet} variant={benefice >= 0 ? "success" : "destructive"} />
          <StatCard title="Marge" value={`${marge}%`} icon={Percent} variant={marge >= 50 ? "success" : marge >= 20 ? "warning" : "destructive"} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CA vs Dépenses */}
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">CA vs Dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyComparison.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyComparison} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={FCFA} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} FCFA`} contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 90%)", fontSize: 13 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ca" name="Chiffre d'affaires" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="depenses" name="Dépenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Dépenses par catégorie */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Dépenses par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v.toLocaleString()} FCFA`} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {categoryData.slice(0, 5).map((c, i) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        {c.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bénéfice par ville */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Bénéfice par ville</CardTitle>
          </CardHeader>
          <CardContent>
            {cityProfitData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée</div>
            ) : (
              <div className="space-y-3 mt-2">
                {cityProfitData.map((c, i) => {
                  const maxAbs = Math.max(...cityProfitData.map(x => Math.abs(x.benefice)), 1);
                  const pct = Math.round((Math.abs(c.benefice) / maxAbs) * 100);
                  return (
                    <div key={c.city}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-card-foreground">{c.city}</span>
                        <span className={c.benefice >= 0 ? "text-success" : "text-destructive"}>
                          {c.benefice >= 0 ? "+" : ""}{c.benefice.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>CA: {c.ca.toLocaleString()}</span>
                        <span>·</span>
                        <span>Dépenses: {c.depenses.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: c.benefice >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
