import { AppLayout } from "@/components/layout/AppLayout";
import { useRentPayments, useCities } from "@/hooks/useData";
import { useEscalationTasks } from "@/hooks/useEscalationTasks";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusBadge, EscalationBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, AlertTriangle, CheckCircle2, Clock, Loader2, ListTodo, Plus, Check, FileText, CalendarClock, ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdvancePaymentDialog } from "@/components/rent/AdvancePaymentDialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEscalationInfo, defaultTasksByLevel, type EscalationInfo } from "@/lib/escalation";
import { generateMiseEnDemeure } from "@/lib/generateMiseEnDemeure";
import { QuittanceDialog } from "@/components/rent/QuittanceDialog";
import type { QuittanceData } from "@/lib/generateQuittance";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useProfile } from "@/hooks/useProfile";

const paymentMethods = ["Espèces", "Virement bancaire", "Chèque", "Mobile Money", "Carte bancaire"];

export default function Rents() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [escalationFilter, setEscalationFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], method: "", comment: "" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQuittance, setShowQuittance] = useState(false);
  const [quittanceData, setQuittanceData] = useState<QuittanceData | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceTenant, setAdvanceTenant] = useState<{ id: string; full_name: string; rent: number } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowPayment(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const { data: payments, loading, refetch } = useRentPayments();
  const { data: cities } = useCities();
  const { data: allTasks, refetch: refetchTasks } = useEscalationTasks();
  const { settings: orgSettings } = useOrganizationSettings();
  const { profile } = useProfile();

  // Compute escalation info for each payment
  const paymentsWithEscalation = useMemo(() =>
    payments.map(p => ({
      ...p,
      escalation: getEscalationInfo(p.due_date, p.status, p.paid_amount, p.amount),
    })),
    [payments]
  );

  // Extract unique months for the filter
  const availableMonths = useMemo(() => {
    const months = [...new Set(payments.map(p => p.month))].sort().reverse();
    return months;
  }, [payments]);

  const filtered = paymentsWithEscalation.filter(r => {
    if (monthFilter !== "all" && r.month !== monthFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (cityFilter !== "all") {
      const cityName = cities.find(c => c.id === cityFilter)?.name;
      if (r.tenants?.units?.properties?.cities?.name !== cityName) return false;
    }
    if (escalationFilter !== "all") {
      if (escalationFilter === "light" && r.escalation.level !== "light") return false;
      if (escalationFilter === "moderate" && r.escalation.level !== "moderate") return false;
      if (escalationFilter === "critical" && r.escalation.level !== "critical") return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [statusFilter, cityFilter, escalationFilter, monthFilter, pageSize]);

  const totalDue = payments.reduce((s, r) => s + r.amount, 0);
  const totalPaid = payments.reduce((s, r) => s + r.paid_amount, 0);
  const totalUnpaid = totalDue - totalPaid;
  const lateCount = paymentsWithEscalation.filter(r => r.escalation.level !== "none").length;
  const criticalCount = paymentsWithEscalation.filter(r => r.escalation.level === "critical").length;

  const openPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPayForm({ amount: (payment.amount - payment.paid_amount).toString(), date: new Date().toISOString().split("T")[0], method: "", comment: "" });
    setShowPayment(true);
  };

  const openTasks = (payment: any) => {
    setSelectedPayment(payment);
    setShowTasks(true);
  };

  const openQuittance = (payment: any) => {
    // Generate unique quittance number from payment id and date
    const datePrefix = payment.due_date?.replace(/-/g, "").slice(2, 8) ?? "";
    const idSuffix = payment.id?.slice(0, 6).toUpperCase() ?? "";
    const quittanceNumber = `Q-${datePrefix}-${idSuffix}`;

    setQuittanceData({
      quittanceNumber,
      agentName: profile?.full_name || undefined,
      tenantName: payment.tenants?.full_name ?? "",
      tenantPhone: payment.tenants?.phone ?? "",
      tenantEmail: payment.tenants?.email ?? "",
      unitName: payment.tenants?.units?.name ?? "",
      propertyName: payment.tenants?.units?.properties?.name ?? "",
      propertyAddress: "",
      amount: payment.amount,
      paidAmount: payment.paid_amount,
      dueDate: payment.due_date,
      month: payment.month,
      paymentDate: payment.updated_at ?? payment.due_date,
      organizationName: orgSettings?.name,
      organizationAddress: orgSettings?.address ?? undefined,
      organizationPhone: orgSettings?.phone ?? undefined,
      organizationEmail: orgSettings?.email ?? undefined,
    });
    setShowQuittance(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment || !payForm.amount || !payForm.method) return;
    setSaving(true);
    const paidAmount = parseInt(payForm.amount);
    const newPaidTotal = selectedPayment.paid_amount + paidAmount;
    const remaining = selectedPayment.amount - newPaidTotal;

    await supabase.from("payment_records").insert({
      rent_payment_id: selectedPayment.id,
      amount: paidAmount,
      payment_date: payForm.date,
      method: payForm.method,
      comment: payForm.comment,
    });

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

  const handleCreateTask = async (payment: any, title: string, description: string, level: number) => {
    await supabase.from("escalation_tasks").insert({
      rent_payment_id: payment.id,
      title,
      description,
      escalation_level: level,
    });
    toast.success("Tâche créée");
    refetchTasks();
  };

  const handleCompleteTask = async (taskId: string) => {
    await supabase.from("escalation_tasks").update({
      status: "done",
      completed_at: new Date().toISOString(),
    }).eq("id", taskId);
    toast.success("Tâche terminée");
    refetchTasks();
  };

  const pendingTasks = allTasks.filter(t => t.status === "pending" || t.status === "in_progress");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Gestion des loyers</h1>
            <p className="text-muted-foreground text-sm mt-1">Suivi des paiements, escalade et impayés</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total dû" value={`${totalDue.toLocaleString("fr-FR")} FCFA`} icon={CreditCard} />
          <StatCard title="Total encaissé" value={`${totalPaid.toLocaleString("fr-FR")} FCFA`} icon={CheckCircle2} variant="success" />
          <StatCard title="Impayés" value={`${totalUnpaid.toLocaleString("fr-FR")} FCFA`} icon={AlertTriangle} variant="destructive" />
          <StatCard title="Critiques" value={criticalCount.toString()} icon={Clock} variant="warning" subtitle="impayés 30j+" />
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList>
            <TabsTrigger value="payments">Loyers</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <ListTodo className="h-4 w-4" />
              Tâches
              {pendingTasks.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 font-bold">{pendingTasks.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Tous les mois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Select value={escalationFilter} onValueChange={setEscalationFilter}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Niveau d'escalade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="light">🟡 Retard léger (1-7j)</SelectItem>
                  <SelectItem value="moderate">🟠 Retard important (8-30j)</SelectItem>
                  <SelectItem value="critical">🔴 Impayé critique (30j+)</SelectItem>
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
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium">Escalade</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(payment => (
                          <tr key={payment.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${payment.escalation.level === "critical" ? "bg-destructive/5" : ""}`}>
                            <td className="py-3 px-4">
                              <p className="font-medium text-card-foreground">{payment.tenants?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{payment.tenants?.units?.name}</p>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{payment.tenants?.units?.properties?.name}</td>
                            <td className="py-3 px-4 text-right font-medium text-card-foreground">{payment.amount.toLocaleString()} FCFA</td>
                            <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{new Date(payment.due_date).toLocaleDateString("fr-FR")}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <PaymentStatusBadge status={payment.status} />
                                {payment.status === "paid" && new Date(payment.due_date) > new Date() && (
                                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Payé d'avance</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <EscalationBadge level={payment.escalation.level} label={payment.escalation.label} />
                              {payment.escalation.daysLate > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">{payment.escalation.daysLate}j</p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {payment.status === "paid" && (
                                  <Button variant="ghost" size="sm" onClick={() => openQuittance(payment)} title="Voir la quittance">
                                    <FileText className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Quittance</span>
                                  </Button>
                                )}
                                {payment.status !== "paid" && (
                                  <Button variant="outline" size="sm" onClick={() => openPayment(payment)}>Payer</Button>
                                )}
                                {payment.tenants && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Paiement anticipé multi-mois"
                                    onClick={() => {
                                      setAdvanceTenant({
                                        id: payment.tenant_id,
                                        full_name: payment.tenants?.full_name ?? "",
                                        rent: payment.amount,
                                      });
                                      setShowAdvance(true);
                                    }}
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                  </Button>
                                )}
                                {payment.escalation.level !== "none" && (
                                  <Button variant="ghost" size="sm" onClick={() => openTasks(payment)} title="Gérer les tâches">
                                    <ListTodo className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div className="text-xs text-muted-foreground">
                  Affichage {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                    <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[80px] text-center">Page {currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">Aucune tâche en cours.</div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(task => {
                  const relatedPayment = payments.find(p => p.id === task.rent_payment_id);
                  return (
                    <Card key={task.id} className="border-border">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-card-foreground">{task.title}</p>
                            <EscalationBadge
                              level={task.escalation_level === 1 ? "light" : task.escalation_level === 2 ? "moderate" : "critical"}
                              label={task.escalation_level === 1 ? "Niv.1" : task.escalation_level === 2 ? "Niv.2" : "Niv.3"}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          {relatedPayment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {relatedPayment.tenants?.full_name} — {relatedPayment.amount.toLocaleString()} FCFA
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleCompleteTask(task.id)} className="shrink-0">
                          <Check className="h-4 w-4 mr-1" /> Fait
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment dialog */}
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

      {/* Tasks dialog for a specific payment */}
      <Dialog open={showTasks} onOpenChange={setShowTasks}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tâches d'escalade</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <>
              <div className="p-3 rounded-lg bg-muted text-sm mb-2">
                <p className="font-medium text-card-foreground">{selectedPayment.tenants?.full_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <EscalationBadge level={selectedPayment.escalation?.level ?? "none"} label={selectedPayment.escalation?.label ?? ""} />
                  <span className="text-muted-foreground">{selectedPayment.escalation?.daysLate ?? 0} jours de retard</span>
                </div>
                <p className="text-muted-foreground mt-1">
                  Reste dû : {(selectedPayment.amount - selectedPayment.paid_amount).toLocaleString()} FCFA
                </p>
              </div>

              {/* Existing tasks for this payment */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTasks.filter(t => t.rent_payment_id === selectedPayment.id).map(task => (
                  <div key={task.id} className={`flex items-center justify-between p-2 rounded-md border border-border text-sm ${task.status === "done" ? "opacity-50" : ""}`}>
                    <div>
                      <p className="font-medium text-card-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.status === "done" ? "✓ Terminée" : "En attente"}</p>
                    </div>
                    {task.status !== "done" && (
                      <Button variant="ghost" size="sm" onClick={() => handleCompleteTask(task.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Suggested actions */}
              <div className="border-t border-border pt-3 mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Actions suggérées</p>
                <div className="flex flex-wrap gap-2">
                  {(defaultTasksByLevel[selectedPayment.escalation?.numericLevel ?? 1] ?? []).map((tpl, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleCreateTask(selectedPayment, tpl.title, tpl.description, selectedPayment.escalation?.numericLevel ?? 1)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {tpl.title}
                    </Button>
                  ))}
                  {(selectedPayment.escalation?.numericLevel ?? 0) >= 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-destructive/30 text-destructive"
                      onClick={() => {
                        generateMiseEnDemeure({
                          tenantName: selectedPayment.tenants?.full_name ?? "",
                          tenantPhone: selectedPayment.tenants?.phone ?? "",
                          tenantEmail: selectedPayment.tenants?.email ?? "",
                          unitName: selectedPayment.tenants?.units?.name ?? "",
                          propertyName: selectedPayment.tenants?.units?.properties?.name ?? "",
                          propertyAddress: "",
                          amount: selectedPayment.amount,
                          paidAmount: selectedPayment.paid_amount,
                          dueDate: selectedPayment.due_date,
                          daysLate: selectedPayment.escalation?.daysLate ?? 0,
                        });
                        toast.success("PDF de mise en demeure généré");
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Mise en demeure (PDF)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <QuittanceDialog open={showQuittance} onOpenChange={setShowQuittance} data={quittanceData} />

      <AdvancePaymentDialog
        open={showAdvance}
        onOpenChange={setShowAdvance}
        tenant={advanceTenant}
        rentDueDay={orgSettings?.rent_due_day ?? 5}
        acceptedPaymentMethods={orgSettings?.accepted_payment_methods ?? paymentMethods}
        onComplete={() => refetch()}
      />
    </AppLayout>
  );
}
