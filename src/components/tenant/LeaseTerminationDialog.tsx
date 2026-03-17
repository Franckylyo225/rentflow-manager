import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { format, addMonths, differenceInDays, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  { value: "normal", label: "Fin de bail normale (à échéance)" },
  { value: "anticipee_locataire", label: "Résiliation anticipée par locataire" },
  { value: "anticipee_proprietaire", label: "Résiliation par propriétaire" },
  { value: "impaye", label: "Départ pour impayé / contentieux" },
] as const;

const NOTICE_DURATIONS = [
  { value: 1, label: "1 mois" },
  { value: 2, label: "2 mois" },
  { value: 3, label: "3 mois" },
  { value: 6, label: "6 mois" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  payments: any[];
  onComplete: () => void;
}

export function LeaseTerminationDialog({ open, onOpenChange, tenant, payments, onComplete }: Props) {
  const [step, setStep] = useState<"init" | "summary" | "confirm">("init");
  const [reason, setReason] = useState("");
  const [notificationDate, setNotificationDate] = useState<Date | undefined>(new Date());
  const [noticeDuration, setNoticeDuration] = useState("1");
  const [repairCost, setRepairCost] = useState(0);
  const [repairDescription, setRepairDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveDate = useMemo(() => {
    if (!notificationDate) return null;
    return addMonths(notificationDate, parseInt(noticeDuration));
  }, [notificationDate, noticeDuration]);

  const financialSummary = useMemo(() => {
    if (!effectiveDate) return null;

    // Remaining unpaid rent
    const remainingRentDue = payments
      .filter(p => p.status !== "paid")
      .reduce((sum: number, p: any) => sum + (p.amount - p.paid_amount), 0);

    const depositAmount = tenant.deposit;
    const totalDue = remainingRentDue + repairCost;
    const balance = depositAmount - totalDue;

    return {
      remainingRentDue,
      repairCost,
      pendingCharges: repairCost,
      penalties: 0,
      depositAmount,
      totalDue: Math.max(0, totalDue),
      depositRetained: Math.max(0, Math.min(depositAmount, totalDue)),
      balance,
    };
  }, [effectiveDate, payments, tenant, repairCost]);

  const canProceed = reason && notificationDate && noticeDuration;

  const handleNext = () => {
    if (step === "init" && canProceed) setStep("summary");
    else if (step === "summary") setStep("confirm");
  };

  const handleClose = async () => {
    if (!effectiveDate || !financialSummary || !notificationDate) return;
    setSaving(true);
    try {
      // 1. Insert bail termination record
      const { error: termError } = await supabase.from("bail_terminations").insert({
        tenant_id: tenant.id,
        reason,
        notification_date: format(notificationDate, "yyyy-MM-dd"),
        notice_duration: parseInt(noticeDuration),
        effective_date: format(effectiveDate, "yyyy-MM-dd"),
        remaining_rent_due: financialSummary.remainingRentDue,
        pending_charges: financialSummary.pendingCharges,
        penalties: financialSummary.penalties,
        deposit_amount: financialSummary.depositAmount,
        prorata_adjustment: 0,
        total_due: financialSummary.totalDue,
        deposit_retained: financialSummary.depositRetained,
        balance: financialSummary.balance,
        status: "closed",
        closed_at: new Date().toISOString(),
      });
      if (termError) throw termError;

      // 2. Set tenant inactive
      const { error: tenantError } = await supabase.from("tenants").update({ is_active: false }).eq("id", tenant.id);
      if (tenantError) throw tenantError;

      // 3. Set unit vacant
      const { error: unitError } = await supabase.from("units").update({ status: "vacant" as const }).eq("id", tenant.unit_id);
      if (unitError) throw unitError;

      toast({ title: "Bail clôturé", description: `Le bail de ${tenant.full_name} a été clôturé avec succès.` });
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep("init");
    setReason("");
    setNotificationDate(new Date());
    setNoticeDuration("1");
    setRepairCost(0);
    setRepairDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Fin de bail — {tenant.full_name}
          </DialogTitle>
        </DialogHeader>

        {step === "init" && (
          <div className="space-y-5">
            {/* Reason */}
            <div className="space-y-2">
              <Label>Motif de départ *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Choisir le motif..." /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Notification date */}
            <div className="space-y-2">
              <Label>Date de notification *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !notificationDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {notificationDate ? format(notificationDate, "PPP", { locale: fr }) : "Sélectionner..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={notificationDate} onSelect={setNotificationDate} className="p-3 pointer-events-auto" locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notice duration */}
            <div className="space-y-2">
              <Label>Durée du préavis *</Label>
              <Select value={noticeDuration} onValueChange={setNoticeDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE_DURATIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Repair costs */}
            <div className="space-y-2">
              <Label>Coût des réparations (FCFA)</Label>
              <Input
                type="number"
                min={0}
                value={repairCost || ""}
                onChange={e => setRepairCost(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            {repairCost > 0 && (
              <div className="space-y-2">
                <Label>Description des réparations</Label>
                <Textarea
                  value={repairDescription}
                  onChange={e => setRepairDescription(e.target.value)}
                  placeholder="Détaillez les réparations à effectuer..."
                  rows={3}
                />
              </div>
            )}

            {/* Computed effective date */}
            {effectiveDate && (
              <Card className="bg-muted/50 border-border">
                <CardContent className="py-3 px-4">
                  <p className="text-sm text-muted-foreground">Le bail prendra fin le</p>
                  <p className="text-lg font-semibold text-foreground">{format(effectiveDate, "dd MMMM yyyy", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernier loyer dû : {format(startOfMonth(effectiveDate), "MMMM yyyy", { locale: fr })}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" disabled={!canProceed} onClick={handleNext}>
              Calculer le solde
            </Button>
          </div>
        )}

        {step === "summary" && financialSummary && (
          <div className="space-y-5">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Solde locataire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyers restants dus</span>
                  <span className="font-medium text-foreground">{financialSummary.remainingRentDue.toLocaleString()} FCFA</span>
                </div>
                {financialSummary.repairCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coût des réparations</span>
                    <span className="font-medium text-foreground">{financialSummary.repairCost.toLocaleString()} FCFA</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total dû</span>
                  <span className="font-semibold text-foreground">{financialSummary.totalDue.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt de garantie</span>
                  <span className="font-medium text-foreground">{financialSummary.depositAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt retenu</span>
                  <span className="font-medium text-destructive">{financialSummary.depositRetained.toLocaleString()} FCFA</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  {financialSummary.balance >= 0 ? (
                    <>
                      <span className="font-semibold text-foreground">Solde à restituer</span>
                      <Badge variant="outline" className="text-green-600 border-green-600 text-base px-3">
                        {financialSummary.balance.toLocaleString()} FCFA
                      </Badge>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">Solde à payer</span>
                      <Badge variant="destructive" className="text-base px-3">
                        {Math.abs(financialSummary.balance).toLocaleString()} FCFA
                      </Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("init")}>Retour</Button>
              <Button className="flex-1" onClick={handleNext}>Clôturer le bail</Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-5">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Confirmer la clôture du bail</p>
                    <p className="text-sm text-muted-foreground mt-1">Cette action est irréversible. Le bail sera clôturé, le locataire passera en "Ancien locataire" et l'unité sera libérée.</p>
                  </div>
                </div>

                <div className="text-sm space-y-1 pl-7">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Bail clôturé</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Unité → Vacant</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Locataire → Ancien locataire</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Historique conservé</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("summary")}>Retour</Button>
              <Button variant="destructive" className="flex-1" onClick={handleClose} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmer la clôture
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
