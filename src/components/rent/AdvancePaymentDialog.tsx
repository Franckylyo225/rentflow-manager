import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarClock, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Tenant {
  id: string;
  full_name: string;
  rent: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  rentDueDay: number;
  acceptedPaymentMethods: string[];
  onComplete?: () => void;
}

interface MonthRow {
  month: string; // YYYY-MM
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  isArrear: boolean;
  existing: boolean;
  rentPaymentId?: string;
}

function buildMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeDueDate(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const d = new Date(year, monthIndex0, Math.min(day, lastDay));
  return d.toISOString().split("T")[0];
}

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function AdvancePaymentDialog({ open, onOpenChange, tenant, rentDueDay, acceptedPaymentMethods, onComplete }: Props) {
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const rent = tenant?.rent || 0;

  useEffect(() => {
    if (!open || !tenant) return;
    setMethod(acceptedPaymentMethods[0] || "Espèces");
    setComment("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from("rent_payments")
        .select("id, month, amount, paid_amount, status, due_date")
        .eq("tenant_id", tenant.id)
        .order("month", { ascending: true });

      const existing = data || [];
      const todayKey = buildMonthKey(new Date());

      // Arriérés : status != paid AND month <= currentMonth
      const arrearRows: MonthRow[] = existing
        .filter((p: any) => p.status !== "paid" && p.month <= todayKey)
        .map((p: any) => ({
          month: p.month,
          due_date: p.due_date,
          amount: p.amount || 0,
          paid_amount: p.paid_amount || 0,
          remaining: Math.max((p.amount || 0) - (p.paid_amount || 0), 0),
          isArrear: true,
          existing: true,
          rentPaymentId: p.id,
        }));

      // Échéances à venir : tous les mois > currentMonth
      // Mix entre celles déjà créées en base ET 12 mois projetés
      const futureExisting: MonthRow[] = existing
        .filter((p: any) => p.month > todayKey && p.status !== "paid")
        .map((p: any) => ({
          month: p.month,
          due_date: p.due_date,
          amount: p.amount || 0,
          paid_amount: p.paid_amount || 0,
          remaining: Math.max((p.amount || 0) - (p.paid_amount || 0), 0),
          isArrear: false,
          existing: true,
          rentPaymentId: p.id,
        }));

      const existingMonths = new Set(existing.map((p: any) => p.month));
      const now = new Date();
      const projected: MonthRow[] = [];
      for (let i = 1; i <= 12; i++) {
        const dt = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = buildMonthKey(dt);
        if (existingMonths.has(key)) continue;
        projected.push({
          month: key,
          due_date: safeDueDate(dt.getFullYear(), dt.getMonth(), rentDueDay),
          amount: rent,
          paid_amount: 0,
          remaining: rent,
          isArrear: false,
          existing: false,
        });
      }

      const futureRows = [...futureExisting, ...projected].sort((a, b) => a.month.localeCompare(b.month));
      const allRows = [...arrearRows, ...futureRows];

      setRows(allRows);
      // Pré-sélection : tous les arriérés
      setSelected(new Set(arrearRows.map(r => r.month)));
      setLoading(false);
    })();
  }, [open, tenant?.id, rentDueDay, rent]);

  const arrears = useMemo(() => rows.filter(r => r.isArrear), [rows]);
  const futures = useMemo(() => rows.filter(r => !r.isArrear), [rows]);
  const allArrearsSelected = arrears.every(a => selected.has(a.month));

  const selectedRows = useMemo(
    () => rows.filter(r => selected.has(r.month)).sort((a, b) => a.month.localeCompare(b.month)),
    [rows, selected]
  );
  const totalDue = selectedRows.reduce((sum, r) => sum + r.remaining, 0);
  const arrearsCount = selectedRows.filter(r => r.isArrear).length;
  const futuresCount = selectedRows.length - arrearsCount;

  useEffect(() => {
    setAmount(totalDue ? String(totalDue) : "");
  }, [totalDue]);

  const toggleFutureMonth = (monthKey: string) => {
    if (!allArrearsSelected) return;
    const next = new Set(selected);
    if (next.has(monthKey)) {
      // Décocher : décocher aussi tous les futurs APRÈS celui-ci (contiguïté)
      futures.forEach(f => {
        if (f.month >= monthKey) next.delete(f.month);
      });
    } else {
      // Cocher : cocher tous les futurs jusqu'à celui-ci inclus (contiguïté)
      futures.forEach(f => {
        if (f.month <= monthKey) next.add(f.month);
      });
    }
    setSelected(next);
  };

  const submit = async () => {
    if (!tenant || selectedRows.length === 0 || !method) return;
    const amt = parseInt(amount) || 0;
    if (amt <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setSaving(true);
    try {
      // 1. Créer les rent_payments manquants (mois projetés sélectionnés)
      const toInsert = selectedRows
        .filter(r => !r.existing)
        .map(r => ({
          tenant_id: tenant.id,
          amount: r.amount,
          paid_amount: 0,
          due_date: r.due_date,
          month: r.month,
          status: "pending" as const,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase.from("rent_payments").insert(toInsert);
        if (error) throw error;
      }

      // 2. Refetch pour obtenir tous les ids
      const monthKeys = selectedRows.map(r => r.month);
      const { data: refetched, error: rfErr } = await supabase
        .from("rent_payments")
        .select("id, month, amount, paid_amount")
        .eq("tenant_id", tenant.id)
        .in("month", monthKeys);
      if (rfErr) throw rfErr;
      const byMonth = new Map((refetched || []).map((p: any) => [p.month, p]));

      // 3. Allocation séquentielle (arriérés d'abord, puis futurs — déjà triés par month)
      let remaining = amt;
      const groupRef = `ADV-${Date.now().toString(36).toUpperCase()}`;
      const totalLabel = `Paiement anticipé ${selectedRows.length} mois — réf. ${groupRef}${comment ? ` — ${comment}` : ""}`;

      for (const r of selectedRows) {
        if (remaining <= 0) break;
        const rp: any = byMonth.get(r.month);
        if (!rp) continue;
        const due = (rp.amount || 0) - (rp.paid_amount || 0);
        if (due <= 0) continue;
        const allocate = Math.min(remaining, due);
        const newPaid = (rp.paid_amount || 0) + allocate;
        const newStatus: "paid" | "partial" = newPaid >= rp.amount ? "paid" : "partial";

        const { error: recErr } = await supabase.from("payment_records").insert({
          rent_payment_id: rp.id,
          amount: allocate,
          payment_date: paymentDate,
          method,
          comment: totalLabel,
        });
        if (recErr) throw recErr;

        const { error: updErr } = await supabase
          .from("rent_payments")
          .update({ paid_amount: newPaid, status: newStatus })
          .eq("id", rp.id);
        if (updErr) throw updErr;

        remaining -= allocate;
      }

      toast.success(`Paiement enregistré sur ${selectedRows.length} mois`);
      onOpenChange(false);
      onComplete?.();
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "échec de l'opération"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Paiement anticipé
          </DialogTitle>
        </DialogHeader>

        {!tenant ? (
          <p className="text-sm text-muted-foreground">Aucun locataire sélectionné.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium text-card-foreground">{tenant.full_name}</p>
              <p className="text-muted-foreground">Loyer mensuel : {rent.toLocaleString()} FCFA</p>
            </div>

            {arrears.length > 0 && (
              <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3 text-sm flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                <p className="text-orange-700 dark:text-orange-300">
                  <strong>{arrears.length} mois en retard.</strong> Les arriérés doivent être réglés avant tout paiement anticipé.
                </p>
              </div>
            )}

            {arrears.length > 0 && (
              <div>
                <Label className="mb-2 block">Arriérés à régler (obligatoire)</Label>
                <div className="rounded-md border border-border divide-y divide-border">
                  {arrears.map(r => (
                    <div key={r.month} className="flex items-center justify-between p-2.5 bg-orange-500/5">
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked disabled />
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm capitalize">{formatMonthLabel(r.month)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {r.remaining.toLocaleString()} FCFA
                        {r.paid_amount > 0 && <span className="text-xs ml-1">(partiel)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">
                Échéances à venir
                {!allArrearsSelected && <span className="text-xs text-muted-foreground ml-2">(verrouillées tant que les arriérés ne sont pas inclus)</span>}
              </Label>
              <div className="rounded-md border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {futures.map(r => {
                  const checked = selected.has(r.month);
                  const disabled = !allArrearsSelected;
                  return (
                    <label
                      key={r.month}
                      className={`flex items-center justify-between p-2.5 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => toggleFutureMonth(r.month)}
                        />
                        <span className="text-sm capitalize">{formatMonthLabel(r.month)}</span>
                        {!r.existing && <span className="text-xs text-muted-foreground">(à créer)</span>}
                      </div>
                      <span className="text-sm text-muted-foreground">{r.remaining.toLocaleString()} FCFA</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedRows.length > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mois sélectionnés</span>
                  <span className="font-medium">
                    {selectedRows.length}
                    {arrearsCount > 0 && futuresCount > 0 && ` (${arrearsCount} arriéré${arrearsCount > 1 ? "s" : ""} + ${futuresCount} à venir)`}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total dû</span>
                  <span className="text-primary">{totalDue.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant payé (FCFA)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Date de paiement</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Méthode de paiement</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {(acceptedPaymentMethods.length ? acceptedPaymentMethods : ["Espèces", "Virement", "Mobile Money", "Chèque"]).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving || !tenant || selectedRows.length === 0 || !method || !amount}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
