import { AppLayout } from "@/components/layout/AppLayout";
import { useRentPayments, useCities } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const paymentMethods = ["Espèces", "Virement bancaire", "Chèque", "Mobile Money", "Carte bancaire"];

export default function Rents() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], method: "", comment: "" });

  const { data: payments, loading, refetch } = useRentPayments();
  const { data: cities } = useCities();

  const filtered = payments.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (cityFilter !== "all") {
      const cityName = cities.find(c => c.id === cityFilter)?.name;
      const paymentCity = r.tenants?.units?.properties?.cities?.name;
      if (paymentCity !== cityName) return false;
    }
    return true;
  });

  const totalDue = payments.reduce((s, r) => s + r.amount, 0);
  const totalPaid = payments.reduce((s, r) => s + r.paid_amount, 0);
  const totalUnpaid = totalDue - totalPaid;
  const lateCount = payments.filter(r => r.status === "late").length;

  const openPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPayForm({ amount: (payment.amount - payment.paid_amount).toString(), date: new Date().toISOString().split("T")[0], method: "", comment: "" });
    setShowPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment || !payForm.amount || !payForm.method) return;
    setSaving(true);
    const paidAmount = parseInt(payForm.amount);
    const newPaidTotal = selectedPayment.paid_amount + paidAmount;
    const remaining = selectedPayment.amount - newPaidTotal;

    // Insert payment record
    await supabase.from("payment_records").insert({
      rent_payment_id: selectedPayment.id,
      amount: paidAmount,
      payment_date: payForm.date,
      method: payForm.method,
      comment: payForm.comment,
    });

    // Update rent_payment status
    let newStatus: "paid" | "partial" | "late" = "partial";
    if (remaining <= 0) newStatus = "paid";
    else if (new Date(selectedPayment.due_date) < new Date()) newStatus = "late";

    await supabase.from("rent_payments").update({
      paid_amount: newPaidTotal,
      status: newStatus,
    }).eq("id", selectedPayment.id);

    toast.success("Paiement enregistré");
    setShowPayment(false);
    setSelectedPayment(null);
    setSaving(false);
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion des loyers</h1>
            <p className="text-muted-foreground text-sm mt-1">Suivi des paiements et échéances</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total dû" value={`${(totalDue / 1000000).toFixed(1)}M FCFA`} icon={CreditCard} />
          <StatCard title="Total encaissé" value={`${(totalPaid / 1000000).toFixed(1)}M FCFA`} icon={CheckCircle2} variant="success" />
          <StatCard title="Impayés" value={`${(totalUnpaid / 1000000).toFixed(1)}M FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="En retard" value={lateCount.toString()} icon={Clock} variant="warning" subtitle="locataires" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {payments.length === 0 ? "Aucun loyer à afficher. Ajoutez des locataires pour générer des échéances." : "Aucun résultat."}
          </div>
        ) : (
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
                          <p className="font-medium text-card-foreground">{payment.tenants?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.tenants?.units?.name}</p>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{payment.tenants?.units?.properties?.name}</td>
                        <td className="py-3 px-4 text-right font-medium text-card-foreground">{payment.amount.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{new Date(payment.due_date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 px-4 text-center"><PaymentStatusBadge status={payment.status} /></td>
                        <td className="py-3 px-4 text-center">
                          {payment.status !== "paid" && (
                            <Button variant="outline" size="sm" onClick={() => openPayment(payment)}>Payer</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="p-3 rounded-lg bg-muted text-sm mb-2">
              <p className="font-medium text-card-foreground">{selectedPayment.tenants?.full_name} — {selectedPayment.tenants?.units?.name}</p>
              <p className="text-muted-foreground">Reste : {(selectedPayment.amount - selectedPayment.paid_amount).toLocaleString()} FCFA</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant payé (FCFA)</Label>
              <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date de paiement</Label>
              <Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={payForm.method} onValueChange={v => setPayForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea value={payForm.comment} onChange={e => setPayForm(f => ({ ...f, comment: e.target.value }))} placeholder="Note optionnelle..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
            <Button onClick={handleRecordPayment} disabled={saving || !payForm.amount || !payForm.method}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
