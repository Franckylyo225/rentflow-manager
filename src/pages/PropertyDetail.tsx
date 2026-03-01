import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUnits } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Home, Plus, Users, DollarSign, Edit, Loader2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", rent: "", charges: "" });
  const [property, setProperty] = useState<any>(null);
  const [propLoading, setPropLoading] = useState(true);

  const { data: propertyUnits, loading: unitsLoading, refetch: refetchUnits } = useUnits(id);

  useEffect(() => {
    if (!id) return;
    supabase.from("properties").select("*, cities(name)").eq("id", id).single().then(({ data }) => {
      setProperty(data);
      setPropLoading(false);
    });
  }, [id]);

  if (propLoading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Bien introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </AppLayout>
    );
  }

  const occupied = propertyUnits.filter(u => u.status === "occupied").length;
  const vacant = propertyUnits.filter(u => u.status === "vacant").length;
  const totalRevenue = propertyUnits.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.rent) return;
    setSaving(true);
    const { error } = await supabase.from("units").insert({
      property_id: id,
      name: unitForm.name,
      rent: parseInt(unitForm.rent),
      charges: parseInt(unitForm.charges) || 0,
      status: "vacant" as const,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Unité ajoutée");
      setShowAddUnit(false);
      setUnitForm({ name: "", rent: "", charges: "" });
      refetchUnits();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{property.name}</h1>
            <p className="text-muted-foreground text-sm">{property.cities?.name} · {property.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total unités" value={propertyUnits.length.toString()} icon={Home} />
          <StatCard title="Occupées" value={occupied.toString()} icon={Users} variant="success" />
          <StatCard title="Vacantes" value={vacant.toString()} icon={Building2} variant="warning" />
          <StatCard title="Revenus mensuels" value={`${totalRevenue.toLocaleString()}`} icon={DollarSign} subtitle="FCFA" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Unités locatives</h2>
          <Button size="sm" className="gap-2" onClick={() => setShowAddUnit(true)}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une unité
          </Button>
        </div>

        {unitsLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : propertyUnits.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">Aucune unité. Ajoutez-en une pour commencer.</div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">N° Unité</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Loyer</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Charges</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyUnits.map(unit => (
                      <tr key={unit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-card-foreground">{unit.name}</td>
                        <td className="py-3 px-4 text-right text-card-foreground">{unit.rent.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-right text-muted-foreground hidden sm:table-cell">{unit.charges.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={unit.status === "occupied"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted text-muted-foreground border-border"
                          }>
                            {unit.status === "occupied" ? "Occupé" : "Vacant"}
                          </Badge>
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

      <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une unité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro unité</Label>
              <Input value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Apt 301" />
            </div>
            <div className="space-y-2">
              <Label>Loyer mensuel (FCFA)</Label>
              <Input type="number" value={unitForm.rent} onChange={e => setUnitForm(f => ({ ...f, rent: e.target.value }))} placeholder="Ex: 350000" />
            </div>
            <div className="space-y-2">
              <Label>Charges (FCFA)</Label>
              <Input type="number" value={unitForm.charges} onChange={e => setUnitForm(f => ({ ...f, charges: e.target.value }))} placeholder="Ex: 25000" />
            </div>
            <p className="text-xs text-muted-foreground">Statut par défaut : Vacant</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUnit(false)}>Annuler</Button>
            <Button onClick={handleAddUnit} disabled={saving || !unitForm.name || !unitForm.rent}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
