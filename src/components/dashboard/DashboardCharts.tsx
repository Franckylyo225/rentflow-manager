import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Les deux graphiques du tableau de bord, isolés dans leur propre module.
 *
 * recharts pèse à lui seul plus de 100 Ko compressés. Importé depuis la page,
 * il retardait l'affichage des indicateurs du haut, qui n'en ont pas besoin —
 * leurs courbes miniatures sont du SVG écrit à la main. Chargé à la demande, il
 * n'arrive qu'après le premier rendu.
 */

const FCFA = (v: number) => `${(v / 1000).toFixed(0)}k`;

const STATUS_COLORS: Record<string, string> = {
  paid: "hsl(160, 84%, 39%)",
  late: "hsl(0, 72%, 51%)",
  partial: "hsl(38, 92%, 50%)",
  pending: "hsl(220, 10%, 70%)",
};

export interface StatusDatum {
  key: string;
  name: string;
  value: number;
  count: number;
}

export interface MonthlyDatum {
  month: string;
  paid: number;
  unpaid: number;
  label: string;
  isSelected: boolean;
}

interface DashboardChartsProps {
  statusData: StatusDatum[];
  totalStatusCount: number;
  monthlyData: MonthlyDatum[];
  monthLabel: string;
}

export default function DashboardCharts({
  statusData,
  totalStatusCount,
  monthlyData,
  monthLabel,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Payment status donut - Databrain style */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            Analyse des statuts
            <span className="text-muted-foreground text-xs font-normal">({monthLabel})</span>
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
  );
}
