import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEmployees, useExpenseCategories } from "@/hooks/useExpenses";
import { useProperties, useCities } from "@/hooks/useData";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Users2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Employees() {
  const { data: employees, loading, refetch } = useEmployees();
  const { data: categories } = useExpenseCategories();
  const { data: properties } = useProperties();
  const { data: cities } = useCities();
  const { profile } = useProfile();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", position: "", monthly_salary: "", city_id: "", property_id: "",
  });

  const totalSalaries = useMemo(() =>
    employees.filter(e => e.is_active).reduce((s, e) => s + e.monthly_salary, 0),
    [employees]
  );

  const handleSave = async () => {
    if (!form.full_name || !form.monthly_salary) return;
    setSaving(true);

    // Create employee
    const { data: emp, error: empError } = await supabase.from("employees").insert({
      organization_id: profile?.organization_id,
      full_name: form.full_name,
      position: form.position,
      monthly_salary: parseInt(form.monthly_salary),
      city_id: form.city_id && form.city_id !== "none" ? form.city_id : null,
      property_id: form.property_id && form.property_id !== "none" ? form.property_id : null,
    }).select().single();

    if (empError) { toast.error("Erreur : " + empError.message); setSaving(false); return; }

    // Auto-create recurring salary expense
    const salaryCategory = categories.find(c => c.name === "Salaires personnel");
    if (salaryCategory && emp) {
      await supabase.from("expenses").insert({
        organization_id: profile?.organization_id,
        category_id: salaryCategory.id,
        amount: parseInt(form.monthly_salary),
        expense_date: new Date().toISOString().split("T")[0],
        description: `Salaire - ${form.full_name} (${form.position})`,
        expense_type: "fixe",
        frequency: "mensuelle",
        employee_id: emp.id,
        city_id: form.city_id && form.city_id !== "none" ? form.city_id : null,
        property_id: form.property_id && form.property_id !== "none" ? form.property_id : null,
      });
    }

    toast.success("Employé ajouté avec dépense mensuelle");
    setShowAdd(false);
    setForm({ full_name: "", position: "", monthly_salary: "", city_id: "", property_id: "" });
    setSaving(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    // Delete related expenses first
    await supabase.from("expenses").delete().eq("employee_id", id);
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Employé supprimé");
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Salaires & Employés</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {employees.filter(e => e.is_active).length} employés · Masse salariale : {totalSalaries.toLocaleString()} FCFA/mois
            </p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter un employé
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p>Aucun employé enregistré.</p>
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Poste</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Ville</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Bien</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Salaire</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-card-foreground">{e.full_name}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{e.position || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{e.cities?.name || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{e.properties?.name || "—"}</td>
                        <td className="py-3 px-4 text-right font-medium text-card-foreground">{e.monthly_salary.toLocaleString()} FCFA</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={e.is_active ? "default" : "secondary"} className="text-xs">
                            {e.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ajouter un employé</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Poste</Label>
                <Input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Ex: Gardien" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salaire mensuel (FCFA) *</Label>
              <Input type="number" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville d'affectation</Label>
                <Select value={form.city_id} onValueChange={v => setForm(f => ({ ...f, city_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bien associé</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.full_name || !form.monthly_salary}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
