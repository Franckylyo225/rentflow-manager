import { AppLayout } from "@/components/layout/AppLayout";
import { rentPayments, cities, paymentMethods, months } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Rents() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const filtered = rentPayments.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (cityFilter !== "all" && r.cityName !== cities.find(c => c.id === cityFilter)?.name) return false;
    if (monthFilter !== "all" && r.month !== monthFilter) return false;
    return true;
  });

  const totalDue = rentPayments.reduce((s, r) => s + r.amount, 0);
  const totalPaid = rentPayments.reduce((s, r) => s + r.paidAmount, 0);
  const totalUnpaid = totalDue - totalPaid;
  const lateCount = rentPayments.filter(r => r.status === "late").length;

  const openPayment = (id: string) => {
    setSelectedPayment(id);
    setShowPayment(true);
  };

  const handleRecordPayment = () => {
    toast.success("Paiement enregistré avec succès");
    setShowPayment(false);
    setSelectedPayment(null);
  };

  const selected = rentPayments.find(r => r.id === selectedPayment);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion des loyers</h1>
            <p className="text-muted-foreground text-sm mt-1">Suivi des paiements et échéances</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowPayment(true)}>
            <CreditCard className="h-4 w-4" /> Enregistrer un paiement
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total dû" value={`${(totalDue / 1000000).toFixed(1)}M FCFA`} icon={CreditCard} />
          <StatCard title="Total encaissé" value={`${(totalPaid / 1000000).toFixed(1)}M FCFA`} icon={CheckCircle2} variant="success" />
          <StatCard title="Impayés" value={`${(totalUnpaid / 1000000).toFixed(1)}M FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="En retard" value={lateCount.toString()} icon={Clock} variant="warning" subtitle="locataires" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
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
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tous les mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mois</SelectItem>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Locataire</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Bien</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Montant</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Échéance</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(payment => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-card-foreground">{payment.tenantName}</p>
                        <p className="text-xs text-muted-foreground">{payment.unitName}</p>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{payment.propertyName}</td>
                      <td className="py-3 px-4 text-right font-medium text-card-foreground">{payment.amount.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{new Date(payment.dueDate).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4 text-center"><PaymentStatusBadge status={payment.status} /></td>
                      <td className="py-3 px-4 text-center">
                        {payment.status !== "paid" && (
                          <Button variant="outline" size="sm" onClick={() => openPayment(payment.id)}>
                            Payer
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="p-3 rounded-lg bg-muted text-sm mb-2">
              <p className="font-medium text-card-foreground">{selected.tenantName} — {selected.unitName}</p>
              <p className="text-muted-foreground">Montant dû : {selected.amount.toLocaleString()} FCFA · Reste : {(selected.amount - selected.paidAmount).toLocaleString()} FCFA</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant payé (FCFA)</Label>
              <Input type="number" placeholder={selected ? (selected.amount - selected.paidAmount).toString() : "0"} />
            </div>
            <div className="space-y-2">
              <Label>Date de paiement</Label>
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea placeholder="Note optionnelle..." rows={2} />
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-xs text-accent-foreground">
              <strong>Règle :</strong> Si montant = total → Payé · Si montant {"<"} total → Partiel · Si date {">"} échéance → En retard
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
            <Button onClick={handleRecordPayment}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
