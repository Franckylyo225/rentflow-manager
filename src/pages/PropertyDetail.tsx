import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUnits } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Building2, Home, Plus, Users, DollarSign, Edit, Trash2, Loader2, TrendingUp, FileDown, Landmark, Target, Calendar } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeProfitability, generatePropertyReport } from "@/lib/generatePropertyReport";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showEditUnit, setShowEditUnit] = useState(false);
  const [showDeleteUnit, setShowDeleteUnit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", rent: "", charges: "", rooms: "1", floor: "" });
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [deletingUnit, setDeletingUnit] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [propLoading, setPropLoading] = useState(true);
  const [totalCollected, setTotalCollected] = useState(0);
  const { settings } = useOrganizationSettings();

  // Bulk add state
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [bulkConfig, setBulkConfig] = useState({
    prefix: "Apt ",
    startNumber: "1",
    count: "5",
    rooms: "1",
    floor: "",
    charges: "",
    rentMode: "same" as "same" | "different",
    rentSame: "",
  });
  const [bulkRows, setBulkRows] = useState<{ name: string; rent: string; floor: string }[]>([]);

  const { data: propertyUnits, loading: unitsLoading, refetch: refetchUnits } = useUnits(id);

  useEffect(() => {
    if (!id) return;
    supabase.from("properties").select("*, cities(name)").eq("id", id).single().then(({ data }) => {
      setProperty(data);
      setPropLoading(false);
    });
  }, [id]);

  // Fetch total rent collected for this property
  useEffect(() => {
    if (!id || propertyUnits.length === 0) {
      setTotalCollected(0);
      return;
    }
    (async () => {
      const unitIds = propertyUnits.map(u => u.id);
      const { data: tenants } = await supabase.from("tenants").select("id").in("unit_id", unitIds);
      const tenantIds = (tenants || []).map(t => t.id);
      if (tenantIds.length === 0) { setTotalCollected(0); return; }
      const { data: payments } = await supabase
        .from("rent_payments")
        .select("paid_amount")
        .in("tenant_id", tenantIds);
      const sum = (payments || []).reduce((s, p) => s + (p.paid_amount || 0), 0);
      setTotalCollected(sum);
    })();
  }, [id, propertyUnits]);

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
  const monthlyRevenuePotential = propertyUnits.reduce((s, u) => s + u.rent, 0);

  const acquisitionCost = property.acquisition_cost || 0;
  const notaryFees = property.notary_fees || 0;
  const totalCost = acquisitionCost + notaryFees;
  const profitabilityData = computeProfitability({
    totalCost,
    totalCollected,
    monthlyRevenueActual: totalRevenue,
    acquisitionDate: property.acquisition_date,
  });
  const profitabilityPct = Math.min(100, profitabilityData.profitability);

  const handleDownloadReport = () => {
    if (totalCost === 0) {
      toast.error("Renseignez d'abord le coût d'acquisition du bien");
      return;
    }
    generatePropertyReport({
      propertyName: property.name,
      propertyAddress: property.address,
      cityName: property.cities?.name,
      acquisitionCost,
      notaryFees,
      totalCost,
      acquisitionDate: property.acquisition_date,
      totalUnits: propertyUnits.length,
      occupiedUnits: occupied,
      monthlyRevenuePotential,
      monthlyRevenueActual: totalRevenue,
      totalCollected,
      profitability: profitabilityData.profitability,
      monthsToBreakEven: profitabilityData.monthsToBreakEven,
      breakEvenDate: profitabilityData.breakEvenDate,
      amortizationPlan: profitabilityData.amortizationPlan,
      organizationName: settings?.name,
    });
    toast.success("Rapport généré");
  };

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.rent) return;
    setSaving(true);
    const { error } = await supabase.from("units").insert({
      property_id: id,
      name: unitForm.name,
      rent: parseInt(unitForm.rent),
      charges: parseInt(unitForm.charges) || 0,
      rooms: parseInt(unitForm.rooms) || 1,
      floor: unitForm.floor ? parseInt(unitForm.floor) : null,
      status: "vacant" as const,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Unité ajoutée");
      setShowAddUnit(false);
      setUnitForm({ name: "", rent: "", charges: "", rooms: "1", floor: "" });
      refetchUnits();
    }
  };

  const generateBulkRows = () => {
    const count = Math.max(1, Math.min(100, parseInt(bulkConfig.count) || 0));
    const start = parseInt(bulkConfig.startNumber) || 1;
    const rows = Array.from({ length: count }, (_, i) => ({
      name: `${bulkConfig.prefix}${start + i}`,
      rent: bulkConfig.rentMode === "same" ? bulkConfig.rentSame : "",
      floor: bulkConfig.floor,
    }));
    setBulkRows(rows);
  };

  const handleBulkAdd = async () => {
    if (bulkRows.length === 0) { toast.error("Aucune unité à ajouter"); return; }
    const invalid = bulkRows.find(r => !r.name.trim() || !r.rent || isNaN(parseInt(r.rent)));
    if (invalid) { toast.error("Vérifiez les noms et loyers de toutes les unités"); return; }
    const names = bulkRows.map(r => r.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) { toast.error("Noms d'unités en doublon dans la liste"); return; }
    const existingNames = new Set(propertyUnits.map(u => u.name.toLowerCase()));
    const conflict = bulkRows.find(r => existingNames.has(r.name.trim().toLowerCase()));
    if (conflict) { toast.error(`L'unité "${conflict.name}" existe déjà dans ce bien`); return; }

    setSaving(true);
    const payload = bulkRows.map(r => ({
      property_id: id,
      name: r.name.trim(),
      rent: parseInt(r.rent),
      charges: parseInt(bulkConfig.charges) || 0,
      rooms: parseInt(bulkConfig.rooms) || 1,
      floor: r.floor ? parseInt(r.floor) : null,
      status: "vacant" as const,
    }));
    const { error } = await supabase.from("units").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`${bulkRows.length} unités ajoutées`);
      setShowAddUnit(false);
      setBulkRows([]);
      setAddMode("single");
      refetchUnits();
    }
  };

  const handleEditUnit = async () => {
    if (!unitForm.name || !unitForm.rent || !editingUnit) return;
    setSaving(true);
    const { error } = await supabase.from("units").update({
      name: unitForm.name,
      rent: parseInt(unitForm.rent),
      charges: parseInt(unitForm.charges) || 0,
      rooms: parseInt(unitForm.rooms) || 1,
      floor: unitForm.floor ? parseInt(unitForm.floor) : null,
    }).eq("id", editingUnit.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Unité modifiée");
      setShowEditUnit(false);
      setEditingUnit(null);
      refetchUnits();
    }
  };

  const handleDeleteUnit = async () => {
    if (!deletingUnit) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-unit", {
        body: { unitId: deletingUnit.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success("Unité supprimée avec son historique lié");
      setShowDeleteUnit(false);
      setDeletingUnit(null);
      refetchUnits();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Suppression impossible"));
    } finally {
      setSaving(false);
    }
  };

  const openEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setUnitForm({ name: unit.name, rent: unit.rent.toString(), charges: unit.charges.toString(), rooms: (unit.rooms || 1).toString(), floor: unit.floor != null ? unit.floor.toString() : "" });
    setShowEditUnit(true);
  };

  const openDeleteUnit = (unit: any) => {
    setDeletingUnit(unit);
    setShowDeleteUnit(true);
  };

  const unitFormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Numéro unité</Label>
        <Input value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Apt 301" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Nombre de pièces</Label>
          <Input type="number" min="1" value={unitForm.rooms} onChange={e => setUnitForm(f => ({ ...f, rooms: e.target.value }))} placeholder="Ex: 3" />
        </div>
        <div className="space-y-2">
          <Label>Étage (optionnel)</Label>
          <Input type="number" min="0" value={unitForm.floor} onChange={e => setUnitForm(f => ({ ...f, floor: e.target.value }))} placeholder="Ex: 2" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Loyer mensuel (FCFA)</Label>
        <Input type="number" value={unitForm.rent} onChange={e => setUnitForm(f => ({ ...f, rent: e.target.value }))} placeholder="Ex: 350000" />
      </div>
      <div className="space-y-2">
        <Label>Charges (FCFA)</Label>
        <Input type="number" value={unitForm.charges} onChange={e => setUnitForm(f => ({ ...f, charges: e.target.value }))} placeholder="Ex: 25000" />
      </div>
    </div>
  );

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

        <Tabs defaultValue="units" className="space-y-4">
          <TabsList>
            <TabsTrigger value="units" className="gap-2"><Home className="h-3.5 w-3.5" />Unités locatives</TabsTrigger>
            <TabsTrigger value="profitability" className="gap-2"><TrendingUp className="h-3.5 w-3.5" />Rentabilité</TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Unités locatives</h2>
              <Button size="sm" className="gap-2" onClick={() => { setUnitForm({ name: "", rent: "", charges: "", rooms: "1", floor: "" }); setShowAddUnit(true); }}>
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
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Pièces</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Étage</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium">Loyer</th>
                          <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Charges</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                          <th className="text-center py-3 px-4 text-muted-foreground font-medium w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyUnits.map(unit => (
                          <tr key={unit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-medium text-card-foreground">{unit.name}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">{(unit as any).rooms || "—"}</td>
                            <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">{(unit as any).floor != null ? (unit as any).floor : "RDC"}</td>
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
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUnit(unit)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteUnit(unit)} disabled={unit.status === "occupied"}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="profitability" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-foreground">Rentabilité du bien</h2>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleDownloadReport}>
                <FileDown className="h-3.5 w-3.5" /> Télécharger le rapport PDF
              </Button>
            </div>

            {totalCost === 0 ? (
              <Card className="border-dashed border-border">
                <CardContent className="py-10 text-center">
                  <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Renseignez le coût d'acquisition pour activer le calcul de rentabilité.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/properties")}>
                    Modifier le bien
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cost summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Landmark className="h-3.5 w-3.5" /> Coût total d'acquisition
                      </div>
                      <p className="text-2xl font-bold text-foreground">{totalCost.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Achat : {acquisitionCost.toLocaleString()} · Notaire : {notaryFees.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <DollarSign className="h-3.5 w-3.5" /> Cumul loyers perçus
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">{totalCollected.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">FCFA</span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Revenu mensuel actuel : {totalRevenue.toLocaleString()} FCFA
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Target className="h-3.5 w-3.5" /> Rentabilité
                      </div>
                      <p className="text-2xl font-bold text-foreground">{profitabilityData.profitability.toFixed(1)} %</p>
                      <Progress value={profitabilityPct} className="mt-2 h-2" />
                    </CardContent>
                  </Card>
                </div>

                {/* Break-even */}
                <Card className="border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-full bg-amber-500/10 p-3">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">Date estimée de rentabilité</h3>
                      {profitabilityData.monthsToBreakEven === 0 ? (
                        <p className="text-sm text-emerald-600 mt-1">✓ Le bien est déjà rentabilisé !</p>
                      ) : profitabilityData.monthsToBreakEven && profitabilityData.breakEvenDate ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Dans <span className="font-semibold text-foreground">
                            {Math.floor(profitabilityData.monthsToBreakEven / 12)} an(s) {profitabilityData.monthsToBreakEven % 12} mois
                          </span> — soit <span className="font-semibold text-foreground capitalize">{profitabilityData.breakEvenDate}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          Aucun revenu locatif actif — projection impossible.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Amortization plan */}
                {profitabilityData.amortizationPlan.length > 0 && (
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="font-semibold text-foreground text-sm">Plan d'amortissement (jalons annuels)</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Projection basée sur le loyer mensuel actuel ({totalRevenue.toLocaleString()} FCFA)</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left py-2 px-4 text-muted-foreground font-medium">Année</th>
                              <th className="text-left py-2 px-4 text-muted-foreground font-medium">Échéance</th>
                              <th className="text-right py-2 px-4 text-muted-foreground font-medium">Cumul perçu</th>
                              <th className="text-right py-2 px-4 text-muted-foreground font-medium hidden sm:table-cell">Restant</th>
                              <th className="text-right py-2 px-4 text-muted-foreground font-medium">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {profitabilityData.amortizationPlan
                              .filter((r, i) => r.month % 12 === 0 || i === profitabilityData.amortizationPlan.length - 1)
                              .map((row) => {
                                const pct = Math.min(100, (row.cumulativeRevenue / totalCost) * 100);
                                return (
                                  <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                    <td className="py-2 px-4 font-medium text-card-foreground">An {Math.ceil(row.month / 12)}</td>
                                    <td className="py-2 px-4 text-muted-foreground capitalize">{row.date}</td>
                                    <td className="py-2 px-4 text-right text-emerald-600 font-medium">{row.cumulativeRevenue.toLocaleString()}</td>
                                    <td className="py-2 px-4 text-right text-muted-foreground hidden sm:table-cell">{Math.max(0, row.remaining).toLocaleString()}</td>
                                    <td className="py-2 px-4 text-right">
                                      <span className={pct >= 100 ? "text-emerald-600 font-semibold" : "text-foreground"}>
                                        {pct.toFixed(0)}%
                                      </span>
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add unit */}
      <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter une unité</DialogTitle></DialogHeader>
          {unitFormFields}
          <p className="text-xs text-muted-foreground">Statut par défaut : Vacant</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUnit(false)}>Annuler</Button>
            <Button onClick={handleAddUnit} disabled={saving || !unitForm.name || !unitForm.rent}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit unit */}
      <Dialog open={showEditUnit} onOpenChange={setShowEditUnit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Modifier l'unité</DialogTitle></DialogHeader>
          {unitFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUnit(false)}>Annuler</Button>
            <Button onClick={handleEditUnit} disabled={saving || !unitForm.name || !unitForm.rent}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete unit */}
      <AlertDialog open={showDeleteUnit} onOpenChange={setShowDeleteUnit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette unité ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'unité « {deletingUnit?.name} » sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
