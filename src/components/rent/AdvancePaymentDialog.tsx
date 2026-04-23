import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CalendarClock } from "lucide-react";
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

const PRESETS = [2, 3, 6, 12];

function buildMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeDueDate(year: number, monthIndex0: number, day: number) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const d = new Date(year, monthIndex0, Math.min(day, lastDay));
  return d.toISOString().split("T")[0];
}

export function AdvancePaymentDialog({ open, onOpenChange, tenant, rentDueDay, acceptedPaymentMethods, onComplete }: Props) {
  const [monthsCount, setMonthsCount] = useState<number>(2);
  const [customMonths, setCustomMonths] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>(""); // YYYY-MM
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);

  const effectiveCount = monthsCount === 0 ? Math.max(parseInt(customMonths) || 0, 0) : monthsCount;
  const rent = tenant?.rent || 0;
  const totalDefault = rent * effectiveCount;

  // Load existing payments to compute first unpaid month
  useEffect(() => {
    if (!open || !tenant) return;
    setMonthsCount(2);
    setCustomMonths("");
    setMethod(acceptedPaymentMethods[0] || "Espèces");
    setComment("");
    setPaymentDate(new Date().toISOString().split("T")[0]);

    (async () => {
      const { data } = await supabase
        .from("rent_payments")
        .select("id, month, amount, paid_amount, status, due_date")
        .eq("tenant_id", tenant.id)
        .order("month", { ascending: true });
      const list = data || [];
      setExistingPayments(list);
      // first unpaid (status != paid) or next month if all paid
      const firstUnpaid = list.find((p: any) => p.status !== "paid");
      if (firstUnpaid) {
        setStartMonth(firstUnpaid.month);
      } else {
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        setStartMonth(buildMonthKey(next));
      }
    })();
  }, [open, tenant?.id]);

  // Coverage list (months)
  const coverage = useMemo(() => {
    if (!startMonth || effectiveCount <= 0) return [] as { month: string; due_date: string; rent: number }[];
    const [y, m] = startMonth.split("-").map(Number);
    const out: { month: string; due_date: string; rent: number }[] = [];
    for (let i = 0; i < effectiveCount; i++) {
      const dt = new Date(y, m - 1 + i, 1);
      out.push({
        month: buildMonthKey(dt),
        due_date: safeDueDate(dt.getFullYear(), dt.getMonth(), rentDueDay),
        rent,
      });
    }
    return out;
  }, [startMonth, effectiveCount, rent, rentDueDay]);

  // Default amount when coverage changes
  useEffect(() => {
    setAmount(totalDefault ? String(totalDefault) : "");
  }, [totalDefault]);

  const submit = async () => {
    if (!tenant || coverage.length === 0 || !method) return;
    const amt = parseInt(amount) || 0;
    if (amt <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setSaving(true);
    try {
      // 1. Ensure rent_payments exist for all covered months (idempotent)
      const existingByMonth = new Map(existingPayments.map((p: any) => [p.month, p]));
      const toInsert = coverage
        .filter(c => !existingByMonth.has(c.month))
        .map(c => ({
          tenant_id: tenant.id,
          amount: c.rent,
          paid_amount: 0,
          due_date: c.due_date,
          month: c.month,
          status: "pending" as const,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase.from("rent_payments").insert(toInsert);
        if (error) throw error;
      }

      // 2. Refetch covered payments
      const monthKeys = coverage.map(c => c.month);
      const { data: refetched, error: rfErr } = await supabase
        .from("rent_payments")
        .select("id, month, amount, paid_amount, due_date")
        .eq("tenant_id", tenant.id)
        .in("month", monthKeys);
      if (rfErr) throw rfErr;
      const byMonth = new Map((refetched || []).map((p: any) => [p.month, p]));

      // 3. Sequentially allocate amount
      let remaining = amt;
      const groupRef = `ADV-${Date.now().toString(36).toUpperCase()}`;
      const totalLabel = `Paiement anticipé ${coverage.length} mois — réf. ${groupRef}${comment ? ` — ${comment}` : ""}`;

      for (const c of coverage) {
        if (remaining <= 0) break;
        const rp: any = byMonth.get(c.month);
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

      toast.success(`Paiement anticipé enregistré sur ${coverage.length} mois`);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Paiement anticipé
          </DialogTitle>
        </DialogHeader>

        {!tenant ? (
          <p className="text-sm text-muted-foreground">Aucun locataire sélectionné.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium text-card-foreground">{tenant.full_name}</p>
              <p className="text-muted-foreground">Loyer mensuel : {rent.toLocaleString()} FCFA</p>
            </div>

            <div>
              <Label>Mois de départ</Label>
              <Input
                type="month"
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-2 block">Nombre de mois à couvrir</Label>
              <RadioGroup
                value={String(monthsCount)}
                onValueChange={v => setMonthsCount(parseInt(v))}
                className="grid grid-cols-5 gap-2"
              >
                {PRESETS.map(n => (
                  <Label
                    key={n}
                    htmlFor={`m-${n}`}
                    className={`flex items-center justify-center rounded-md border px-3 py-2 cursor-pointer text-sm ${monthsCount === n ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    <RadioGroupItem id={`m-${n}`} value={String(n)} className="sr-only" />
                    {n} mois
                  </Label>
                ))}
                <Label
                  htmlFor="m-custom"
                  className={`flex items-center justify-center rounded-md border px-3 py-2 cursor-pointer text-sm ${monthsCount === 0 ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  <RadioGroupItem id="m-custom" value="0" className="sr-only" />
                  Autre
                </Label>
              </RadioGroup>
              {monthsCount === 0 && (
                <Input
                  type="number"
                  min={1}
                  max={60}
                  placeholder="Nombre personnalisé"
                  className="mt-2"
                  value={customMonths}
                  onChange={e => setCustomMonths(e.target.value)}
                />
              )}
            </div>

            {coverage.length > 0 && (
              <div className="rounded-md border border-border p-3 text-sm space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">Mois couverts ({coverage.length})</p>
                {coverage.map(c => (
                  <div key={c.month} className="flex justify-between">
                    <span className="text-card-foreground">{c.month}</span>
                    <span className="text-muted-foreground">{c.rent.toLocaleString()} FCFA</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-1 mt-1 font-medium">
                  <span>Total estimé</span>
                  <span>{totalDefault.toLocaleString()} FCFA</span>
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
          <Button onClick={submit} disabled={saving || !tenant || coverage.length === 0 || !method || !amount}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
