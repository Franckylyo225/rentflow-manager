import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecordSaleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: { id: string; title: string; organization_id: string } | null;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = ["Virement", "Chèque", "Espèces", "Mobile Money", "Autre"];

export function RecordSaleDialog({ open, onOpenChange, asset, onSuccess }: RecordSaleDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sale_price: "",
    sale_date: new Date().toISOString().slice(0, 10),
    buyer_name: "",
    notary_name: "",
    sale_payment_method: "Virement",
    sale_commission: "",
  });
  const [deedFile, setDeedFile] = useState<File | null>(null);

  const reset = () => {
    setForm({
      sale_price: "",
      sale_date: new Date().toISOString().slice(0, 10),
      buyer_name: "",
      notary_name: "",
      sale_payment_method: "Virement",
      sale_commission: "",
    });
    setDeedFile(null);
  };

  const handleSubmit = async () => {
    if (!asset) return;
    const price = parseInt(form.sale_price, 10);
    if (!price || price <= 0) { toast.error("Le prix de vente est requis"); return; }
    if (!form.buyer_name.trim()) { toast.error("L'acquéreur est requis"); return; }
    if (!form.sale_date) { toast.error("La date de vente est requise"); return; }

    setSaving(true);
    let deedUrl: string | null = null;

    // Upload sale deed if provided
    if (deedFile) {
      const ext = deedFile.name.split(".").pop();
      const path = `${asset.organization_id}/${asset.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("patrimony-sales")
        .upload(path, deedFile);
      if (uploadError) {
        toast.error("Erreur upload acte : " + uploadError.message);
        setSaving(false);
        return;
      }
      deedUrl = path;
    }

    const commission = form.sale_commission ? parseInt(form.sale_commission, 10) : 0;

    const { error } = await supabase
      .from("patrimony_assets")
      .update({
        status: "sold",
        sale_price: price,
        sale_date: form.sale_date,
        buyer_name: form.buyer_name.trim(),
        notary_name: form.notary_name.trim() || null,
        sale_payment_method: form.sale_payment_method,
        sale_commission: commission,
        sale_deed_url: deedUrl,
      })
      .eq("id", asset.id);

    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success("Vente enregistrée — créditée au CA du mois");
    reset();
    onOpenChange(false);
    onSuccess?.();
  };

  const net = (parseInt(form.sale_price, 10) || 0) - (parseInt(form.sale_commission, 10) || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer la vente</DialogTitle>
          <DialogDescription>
            Le montant net sera crédité au chiffre d'affaires du mois de la vente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix de vente (FCFA) *</Label>
              <Input
                type="number"
                value={form.sale_price}
                onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
                placeholder="Ex: 25000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Date de vente *</Label>
              <Input
                type="date"
                value={form.sale_date}
                onChange={(e) => setForm((f) => ({ ...f, sale_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Acquéreur *</Label>
            <Input
              value={form.buyer_name}
              onChange={(e) => setForm((f) => ({ ...f, buyer_name: e.target.value }))}
              placeholder="Nom de l'acheteur"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notaire</Label>
              <Input
                value={form.notary_name}
                onChange={(e) => setForm((f) => ({ ...f, notary_name: e.target.value }))}
                placeholder="Me ..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={form.sale_payment_method} onValueChange={(v) => setForm((f) => ({ ...f, sale_payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Commission d'agence (FCFA)</Label>
            <Input
              type="number"
              value={form.sale_commission}
              onChange={(e) => setForm((f) => ({ ...f, sale_commission: e.target.value }))}
              placeholder="0"
            />
            {form.sale_price && (
              <p className="text-xs text-muted-foreground">
                Net crédité au CA : <span className="font-medium text-foreground">{net.toLocaleString()} FCFA</span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Acte de vente (PDF)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setDeedFile(e.target.files?.[0] || null)}
            />
            {deedFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" /> {deedFile.name}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer la vente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
