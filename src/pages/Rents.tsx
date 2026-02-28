import { AppLayout } from "@/components/layout/AppLayout";
import { rentPayments } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState } from "react";

export default function Rents() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = rentPayments.filter(r => statusFilter === "all" || r.status === statusFilter);

  const totalDue = rentPayments.reduce((s, r) => s + r.amount, 0);
  const totalPaid = rentPayments.reduce((s, r) => s + r.paidAmount, 0);
  const totalUnpaid = totalDue - totalPaid;
  const lateCount = rentPayments.filter(r => r.status === "late").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion des loyers</h1>
          <p className="text-muted-foreground text-sm mt-1">Suivi des paiements et échéances</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total dû" value={`${totalDue.toLocaleString()} FCFA`} icon={CreditCard} />
          <StatCard title="Total encaissé" value={`${totalPaid.toLocaleString()} FCFA`} icon={CheckCircle2} variant="success" />
          <StatCard title="Impayés" value={`${totalUnpaid.toLocaleString()} FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="En retard" value={lateCount.toString()} icon={Clock} variant="warning" subtitle="locataires" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Enregistrer un paiement</Button>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Locataire</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unité</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Bien</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Montant</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Payé</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Échéance</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(payment => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-card-foreground">{payment.tenantName}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{payment.unitName}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{payment.propertyName}</td>
                      <td className="py-3 px-4 text-right font-medium text-card-foreground">{payment.amount.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-right text-muted-foreground hidden sm:table-cell">{payment.paidAmount.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(payment.dueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4"><PaymentStatusBadge status={payment.status} /></td>
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
