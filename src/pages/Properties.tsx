import { AppLayout } from "@/components/layout/AppLayout";
import { useProperties, useCities, useUnits } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export default function Properties() {
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ city_id: "", name: "", address: "", description: "" });
  const navigate = useNavigate();

  const { data: properties, loading, refetch } = useProperties();
  const { data: cities } = useCities();
  const { data: allUnits } = useUnits();
  const { profile } = useProfile();

  const filtered = properties.filter(p => {
    if (cityFilter !== "all" && p.city_id !== cityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Compute unit stats per property
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
      organization_id: profile.organization_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Bien créé avec succès");
      setShowAdd(false);
      setForm({ city_id: "", name: "", address: "", description: "" });
      refetch();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Biens immobiliers</h1>
            <p className="text-muted-foreground text-sm mt-1">{properties.length} biens · {cities.length} villes</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
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
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unités</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Occupées</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Taux</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(property => {
                      const stats = getStats(property.id);
                      return (
                        <tr
                          key={property.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-card-foreground">{property.name}</p>
                            <p className="text-xs text-muted-foreground">{property.address}</p>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{property.cities?.name}</td>
                          <td className="py-3 px-4 text-center text-card-foreground hidden md:table-cell">{stats.total}</td>
                          <td className="py-3 px-4 text-center text-card-foreground hidden md:table-cell">{stats.occupied}</td>
                          <td className="py-3 px-4 text-center hidden lg:table-cell">
                            <span className={`font-medium ${stats.occupancy >= 80 ? "text-success" : stats.occupancy >= 50 ? "text-warning" : "text-destructive"}`}>
                              {stats.occupancy}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-card-foreground">
                            {stats.revenue.toLocaleString()} FCFA
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Select value={form.city_id} onValueChange={v => setForm(f => ({ ...f, city_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.city_id}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
