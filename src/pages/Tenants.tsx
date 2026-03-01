import { AppLayout } from "@/components/layout/AppLayout";
import { useTenants, useProperties, useUnits, useRentPayments } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, ShieldAlert } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeTenantRiskScore, riskStyles, riskProgressColors, type TenantRiskScore } from "@/lib/riskScoring";
import { cn } from "@/lib/utils";

export default function Tenants() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [form, setForm] = useState({
    unit_id: "", full_name: "", phone: "", email: "", id_number: "",
    lease_start: new Date().toISOString().split("T")[0], lease_duration: "12", deposit: "",
  });
  const navigate = useNavigate();

  const { data: tenants, loading, refetch } = useTenants();
  const { data: properties } = useProperties();
  const { data: allUnits } = useUnits();
  const { data: allPayments } = useRentPayments();

  const riskScores = useMemo(() => {
    const map = new Map<string, TenantRiskScore>();
    tenants.forEach(t => map.set(t.id, computeTenantRiskScore(t.id, allPayments)));
    return map;
  }, [tenants, allPayments]);

  const vacantUnits = allUnits.filter(u => u.status === "vacant");
  const filteredVacantUnits = selectedProperty
    ? vacantUnits.filter(u => u.property_id === selectedProperty)
    : vacantUnits;

  const filtered = tenants.filter(t =>
    !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search)
  );

  const selectedUnit = allUnits.find(u => u.id === form.unit_id);

  const handleSave = async () => {
    if (!form.unit_id || !form.full_name) return;
    setSaving(true);

    const unit = allUnits.find(u => u.id === form.unit_id);
    if (!unit) { setSaving(false); return; }

    // Create tenant
    const { error: tenantError } = await supabase.from("tenants").insert({
      unit_id: form.unit_id,
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      id_number: form.id_number,
      lease_start: form.lease_start,
      lease_duration: parseInt(form.lease_duration) || 12,
      rent: unit.rent,
      deposit: parseInt(form.deposit) || unit.rent * 2,
    });

    if (tenantError) {
      toast.error("Erreur : " + tenantError.message);
      setSaving(false);
      return;
    }

    // Update unit status to occupied
    await supabase.from("units").update({ status: "occupied" as const }).eq("id", form.unit_id);

    toast.success("Locataire ajouté et unité mise à jour");
    setShowAdd(false);
    setForm({ unit_id: "", full_name: "", phone: "", email: "", id_number: "", lease_start: new Date().toISOString().split("T")[0], lease_duration: "12", deposit: "" });
    setSelectedProperty("");
    setSaving(false);
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Locataires</h1>
            <p className="text-muted-foreground text-sm mt-1">{tenants.length} locataires actifs</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter un locataire
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {tenants.length === 0 ? "Aucun locataire. Ajoutez d'abord un bien et des unités." : "Aucun résultat."}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Téléphone</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Bien</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unité</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Loyer</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium">
                        <span className="flex items-center justify-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Risque</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tenant => (
                      <tr
                        key={tenant.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                              {tenant.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="font-medium text-card-foreground">{tenant.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{tenant.phone}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.units?.properties?.name}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.units?.name}</td>
                        <td className="py-3 px-4 text-right text-card-foreground hidden lg:table-cell">{tenant.rent.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-center">
                          {(() => {
                            const risk = riskScores.get(tenant.id);
                            if (!risk) return null;
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <Badge variant="outline" className={cn("text-xs font-medium", riskStyles[risk.level])}>
                                      {risk.score}/100
                                    </Badge>
                                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className={cn("h-full rounded-full transition-all", riskProgressColors[risk.level])} style={{ width: `${risk.score}%` }} />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs max-w-48">
                                  <p className="font-semibold mb-1">Risque : {risk.label}</p>
                                  <p>Retards : {risk.lateCount}/{risk.totalPayments} échéances</p>
                                  <p>Moy. retard : {risk.avgDaysLate}j</p>
                                  <p>Impayés : {risk.unpaidAmount.toLocaleString()} FCFA</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un locataire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Bien immobilier</Label>
              <Select value={selectedProperty} onValueChange={v => { setSelectedProperty(v); setForm(f => ({ ...f, unit_id: "" })); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cities?.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unité vacante</Label>
              <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une unité" /></SelectTrigger>
                <SelectContent>
                  {filteredVacantUnits.length === 0 && <SelectItem value="none" disabled>Aucune unité vacante</SelectItem>}
                  {filteredVacantUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} — {u.rent.toLocaleString()} FCFA</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: Kouadio Jean" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 XX XX XX XX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Pièce d'identité</Label>
                <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="CI-XXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date début bail</Label>
                <Input type="date" value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Durée (mois)</Label>
                <Input type="number" value={form.lease_duration} onChange={e => setForm(f => ({ ...f, lease_duration: e.target.value }))} placeholder="12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dépôt de garantie (FCFA)</Label>
              <Input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} placeholder={selectedUnit ? (selectedUnit.rent * 2).toString() : "Ex: 700000"} />
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-xs text-accent-foreground">
              <strong>Règle métier :</strong> Dès validation, l'unité passera en statut "Occupé".
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.unit_id || !form.full_name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
