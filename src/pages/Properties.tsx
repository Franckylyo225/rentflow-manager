import { AppLayout } from "@/components/layout/AppLayout";
import { useProperties, useCities, useUnits, useCountries } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Trash2, Edit, MapPin, Globe, Landmark } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROPERTY_TYPES = [
  { value: "immeuble", label: "Immeuble" },
  { value: "villa", label: "Villa" },
  { value: "duplex", label: "Duplex" },
  { value: "studio", label: "Studio" },
  { value: "appartement", label: "Appartement" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau / Commerce" },
  { value: "autre", label: "Autre" },
];

export default function Properties() {
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [deletingProperty, setDeletingProperty] = useState<any>(null);
  const [form, setForm] = useState({ city_id: "", name: "", address: "", description: "", type: "immeuble" });
  const [cityForm, setCityForm] = useState({ name: "", country_id: "" });
  const [countryForm, setCountryForm] = useState({ name: "", code: "" });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setForm({ city_id: "", name: "", address: "", description: "", type: "immeuble" });
      setShowAdd(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const { data: properties, loading, refetch } = useProperties();
  const { data: cities, refetch: refetchCities } = useCities();
  const { data: countries, refetch: refetchCountries } = useCountries();
  const { data: allUnits } = useUnits();
  const { profile } = useProfile();

  const filtered = properties.filter(p => {
    if (cityFilter !== "all" && p.city_id !== cityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStats = (propId: string) => {
    const propUnits = allUnits.filter(u => u.property_id === propId);
    const total = propUnits.length;
    const occupied = propUnits.filter(u => u.status === "occupied").length;
    const revenue = propUnits.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);
    return { total, occupied, occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0, revenue };
  };

  const handleSave = async () => {
    if (!form.name || !form.city_id || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("properties").insert({
      name: form.name,
      city_id: form.city_id,
      address: form.address,
      description: form.description,
      type: form.type,
      organization_id: profile.organization_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Bien créé avec succès");
      setShowAdd(false);
      setForm({ city_id: "", name: "", address: "", description: "", type: "immeuble" });
      refetch();
    }
  };

  const handleEdit = async () => {
    if (!form.name || !form.city_id || !editingProperty) return;
    setSaving(true);
    const { error } = await supabase.from("properties").update({
      name: form.name,
      city_id: form.city_id,
      address: form.address,
      description: form.description,
      type: form.type,
    }).eq("id", editingProperty.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Bien modifié");
      setShowEdit(false);
      setEditingProperty(null);
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    setSaving(true);
    try {
      // 1. Récupérer toutes les unités du bien
      const { data: propUnits, error: unitsErr } = await supabase
        .from("units")
        .select("id, status")
        .eq("property_id", deletingProperty.id);
      if (unitsErr) throw unitsErr;

      // 2. Bloquer si une unité est occupée
      const occupied = (propUnits || []).filter(u => u.status === "occupied");
      if (occupied.length > 0) {
        throw new Error(`${occupied.length} unité(s) encore occupée(s). Clôturez les baux avant de supprimer le bien.`);
      }

      const unitIds = (propUnits || []).map(u => u.id);

      if (unitIds.length > 0) {
        // 3. Récupérer tous les locataires (actifs ou anciens) liés à ces unités
        const { data: tenantsData, error: tErr } = await supabase
          .from("tenants")
          .select("id")
          .in("unit_id", unitIds);
        if (tErr) throw tErr;
        const tenantIds = (tenantsData || []).map(t => t.id);

        if (tenantIds.length > 0) {
          // 4. Récupérer les paiements de loyer
          const { data: payments, error: pErr } = await supabase
            .from("rent_payments")
            .select("id")
            .in("tenant_id", tenantIds);
          if (pErr) throw pErr;
          const paymentIds = (payments || []).map(p => p.id);

          if (paymentIds.length > 0) {
            // 5. Supprimer escalation_tasks et payment_records liés aux paiements
            const { error: escErr } = await supabase.from("escalation_tasks").delete().in("rent_payment_id", paymentIds);
            if (escErr) throw escErr;
            const { error: prErr } = await supabase.from("payment_records").delete().in("rent_payment_id", paymentIds);
            if (prErr) throw prErr;
            // Détacher les SMS history (pas de DELETE autorisé) — on met à null
            await supabase.from("sms_history").update({ rent_payment_id: null } as any).in("rent_payment_id", paymentIds);
          }

          // 6. Supprimer les paiements
          const { error: rpErr } = await supabase.from("rent_payments").delete().in("tenant_id", tenantIds);
          if (rpErr) throw rpErr;

          // 7. Supprimer les fins de bail
          const { error: btErr } = await supabase.from("bail_terminations").delete().in("tenant_id", tenantIds);
          if (btErr) throw btErr;

          // 8. Supprimer les locataires
          const { error: tDelErr } = await supabase.from("tenants").delete().in("id", tenantIds);
          if (tDelErr) throw tDelErr;
        }

        // 9. Supprimer les unités
        const { error: uDelErr } = await supabase.from("units").delete().in("id", unitIds);
        if (uDelErr) throw uDelErr;
      }

      // 10. Supprimer le bien
      const { error: propErr } = await supabase.from("properties").delete().eq("id", deletingProperty.id);
      if (propErr) throw propErr;

      toast.success("Bien supprimé avec toutes ses données associées");
      setShowDelete(false);
      setDeletingProperty(null);
      refetch();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Suppression impossible"));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (property: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setForm({
      city_id: property.city_id,
      name: property.name,
      address: property.address,
      description: property.description || "",
      type: property.type || "immeuble",
    });
    setShowEdit(true);
  };

  const openDelete = (property: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProperty(property);
    setShowDelete(true);
  };

  const handleAddCity = async () => {
    if (!cityForm.name || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("cities").insert({
      name: cityForm.name,
      organization_id: profile.organization_id,
      country_id: cityForm.country_id || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Ville ajoutée");
      setShowAddCity(false);
      setCityForm({ name: "", country_id: "" });
      refetchCities();
    }
  };

  const handleAddCountry = async () => {
    if (!countryForm.name || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("countries").insert({
      name: countryForm.name,
      code: countryForm.code,
      organization_id: profile.organization_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Pays ajouté");
      setShowAddCountry(false);
      setCountryForm({ name: "", code: "" });
      refetchCountries();
    }
  };

  const propertyFormDialog = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type de bien</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger><SelectValue placeholder="Type de bien" /></SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ville</Label>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowAddCountry(true)}>
              <Globe className="h-3 w-3" /> Pays
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowAddCity(true)}>
              <MapPin className="h-3 w-3" /> Ville
            </Button>
          </div>
        </div>
        <Select value={form.city_id} onValueChange={v => setForm(f => ({ ...f, city_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
          <SelectContent>
            {cities.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.countries?.name ? ` (${c.countries.name})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Nom du bien</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Résidence Les Palmiers" />
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Ex: 12 Bd de France, Cocody" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du bien..." rows={3} />
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Biens immobiliers</h1>
            <p className="text-muted-foreground text-sm mt-1">{properties.length} biens · {cities.length} villes</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => { setForm({ city_id: "", name: "", address: "", description: "", type: "immeuble" }); setShowAdd(true); }}>
            <Plus className="h-4 w-4" /> Ajouter un bien
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un bien..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {properties.length === 0 ? "Aucun bien. Commencez par en ajouter un." : "Aucun résultat."}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom du bien</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Ville</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Type</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unités</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Taux</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenus</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(property => {
                      const stats = getStats(property.id);
                      const typeLabel = PROPERTY_TYPES.find(t => t.value === (property as any).type)?.label || (property as any).type || "—";
                      return (
                        <tr
                          key={property.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-card-foreground">{property.name}</p>
                                <p className="text-xs text-muted-foreground">{property.address}</p>
                              </div>
                              {(property as any).patrimony_asset_id && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/patrimoine/${(property as any).patrimony_asset_id}`); }}
                                      >
                                        <Landmark className="h-2.5 w-2.5" /> Patrimoine
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Issu d'un actif du patrimoine — cliquer pour voir</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{property.cities?.name}</td>
                          <td className="py-3 px-4 text-center hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-card-foreground hidden md:table-cell">{stats.total}</td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell">
                            <span className={`font-medium ${stats.occupancy >= 80 ? "text-success" : stats.occupancy >= 50 ? "text-warning" : "text-destructive"}`}>
                              {stats.occupancy}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-card-foreground">
                            {stats.revenue.toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(property, e)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => openDelete(property, e)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add property */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Ajouter un bien</DialogTitle></DialogHeader>
          {propertyFormDialog(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.city_id}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit property */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Modifier le bien</DialogTitle></DialogHeader>
          {propertyFormDialog(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !form.name || !form.city_id}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete property */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bien « {deletingProperty?.name} » et toutes ses données associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add city */}
      <Dialog open={showAddCity} onOpenChange={setShowAddCity}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter une ville</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pays (optionnel)</Label>
              <Select value={cityForm.country_id} onValueChange={v => setCityForm(f => ({ ...f, country_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
                <SelectContent>
                  {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom de la ville</Label>
              <Input value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Abidjan" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCity(false)}>Annuler</Button>
            <Button onClick={handleAddCity} disabled={saving || !cityForm.name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add country */}
      <Dialog open={showAddCountry} onOpenChange={setShowAddCountry}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un pays</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du pays</Label>
              <Input value={countryForm.name} onChange={e => setCountryForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Sénégal" />
            </div>
            <div className="space-y-2">
              <Label>Code pays (optionnel)</Label>
              <Input value={countryForm.code} onChange={e => setCountryForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: SN" maxLength={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCountry(false)}>Annuler</Button>
            <Button onClick={handleAddCountry} disabled={saving || !countryForm.name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
