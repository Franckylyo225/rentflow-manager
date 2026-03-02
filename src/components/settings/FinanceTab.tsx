import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Banknote, AlertTriangle, Calendar, CreditCard, Save, Loader2 } from "lucide-react";
import { OrganizationSettings } from "@/hooks/useOrganizationSettings";

const ALL_PAYMENT_METHODS = ["Espèces", "Virement", "Mobile Money", "Chèque", "Carte bancaire", "Prélèvement"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface Props {
  settings: OrganizationSettings;
  onSave: (updates: Partial<OrganizationSettings>) => Promise<boolean>;
}

export function FinanceTab({ settings, onSave }: Props) {
  const [form, setForm] = useState({
    late_fee_enabled: settings.late_fee_enabled,
    late_fee_type: settings.late_fee_type || "fixed",
    late_fee_value: settings.late_fee_value || 0,
    late_fee_grace_days: settings.late_fee_grace_days || 0,
    accepted_payment_methods: settings.accepted_payment_methods || ["Espèces"],
    fiscal_year_start: settings.fiscal_year_start || 1,
    deposit_months: settings.deposit_months || 2,
    rent_due_day: settings.rent_due_day || 5,
  });
  const [saving, setSaving] = useState(false);

  const toggleMethod = (method: string) => {
    setForm(prev => ({
      ...prev,
      accepted_payment_methods: prev.accepted_payment_methods.includes(method)
        ? prev.accepted_payment_methods.filter(m => m !== method)
        : [...prev.accepted_payment_methods, method],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form as any);
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Late Fees */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
            <div>
              <CardTitle className="text-base">Pénalités de retard</CardTitle>
              <CardDescription>Configuration des frais appliqués en cas de retard de paiement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Activer les pénalités de retard</p>
              <p className="text-xs text-muted-foreground">Calcul automatique après le délai de grâce</p>
            </div>
            <Switch
              checked={form.late_fee_enabled}
              onCheckedChange={v => setForm(prev => ({ ...prev, late_fee_enabled: v }))}
            />
          </div>

          {form.late_fee_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label>Type de pénalité</Label>
                <Select value={form.late_fee_type} onValueChange={v => setForm(prev => ({ ...prev, late_fee_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Montant fixe</SelectItem>
                    <SelectItem value="percentage">Pourcentage du loyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.late_fee_type === "percentage" ? "Pourcentage (%)" : `Montant (${settings.currency})`}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.late_fee_value}
                  onChange={e => setForm(prev => ({ ...prev, late_fee_value: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jours de grâce</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.late_fee_grace_days}
                  onChange={e => setForm(prev => ({ ...prev, late_fee_grace_days: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Moyens de paiement acceptés</CardTitle>
              <CardDescription>Méthodes proposées lors de l'enregistrement d'un paiement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_PAYMENT_METHODS.map(method => (
              <label
                key={method}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <Checkbox
                  checked={form.accepted_payment_methods.includes(method)}
                  onCheckedChange={() => toggleMethod(method)}
                />
                <span className="text-sm text-card-foreground">{method}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Config */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Configuration de facturation</CardTitle>
              <CardDescription>Paramètres par défaut pour les baux et paiements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Jour d'échéance du loyer</Label>
              <Select value={String(form.rent_due_day)} onValueChange={v => setForm(prev => ({ ...prev, rent_due_day: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15, 20, 25].map(d => (
                    <SelectItem key={d} value={String(d)}>Le {d} du mois</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Caution (mois de loyer)</Label>
              <Select value={String(form.deposit_months)} onValueChange={v => setForm(prev => ({ ...prev, deposit_months: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6].map(m => (
                    <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Début exercice fiscal</Label>
              <Select value={String(form.fiscal_year_start)} onValueChange={v => setForm(prev => ({ ...prev, fiscal_year_start: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
