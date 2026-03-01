import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenses, useExpenseCategories } from "@/hooks/useExpenses";
import { useProperties, useCities } from "@/hooks/useData";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EXPENSE_TYPES = [
  { value: "fixe", label: "Charge fixe" },
  { value: "variable", label: "Charge variable" },
];

const FREQUENCIES = [
  { value: "unique", label: "Unique" },
  { value: "mensuelle", label: "Mensuelle" },
  { value: "trimestrielle", label: "Trimestrielle" },
  { value: "annuelle", label: "Annuelle" },
];

export default function Expenses() {
  const { data: expenses, loading, refetch } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const { data: properties } = useProperties();
  const { data: cities } = useCities();
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0],
    description: "", expense_type: "variable", frequency: "unique",
    property_id: "", city_id: "",
  });

  const filtered = useMemo(() => {
    let result = expenses;
    if (search) result = result.filter(e =>
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.expense_categories?.name.toLowerCase().includes(search.toLowerCase())
    );
    if (categoryFilter !== "all") result = result.filter(e => e.category_id === categoryFilter);
    if (typeFilter !== "all") result = result.filter(e => e.expense_type === typeFilter);
    return result;
  }, [expenses, search, categoryFilter, typeFilter]);

  const totalExpenses = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const handleSave = async () => {
    if (!form.category_id || !form.amount) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      organization_id: profile?.organization_id,
      category_id: form.category_id,
      amount: parseInt(form.amount),
      expense_date: form.expense_date,
      description: form.description,
      expense_type: form.expense_type,
      frequency: form.frequency,
      property_id: form.property_id || null,
      city_id: form.city_id || null,
    });
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    toast.success("Dépense ajoutée");
    setShowAdd(false);
    setForm({ category_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], description: "", expense_type: "variable", frequency: "unique", property_id: "", city_id: "" });
    setSaving(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Dépense supprimée");
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dépenses</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {expenses.length} dépenses · Total : {totalExpenses.toLocaleString()} FCFA
            </p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter une dépense
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p>Aucune dépense enregistrée.</p>
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Catégorie</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Description</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Bien</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Type</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Fréquence</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Montant</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-card-foreground">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{e.expense_categories?.name}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell truncate max-w-48">{e.description || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{e.properties?.name || "—"}</td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell">
                          <Badge variant={e.expense_type === "fixe" ? "default" : "secondary"} className="text-xs">
                            {e.expense_type === "fixe" ? "Fixe" : "Variable"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground text-xs hidden sm:table-cell capitalize">{e.frequency}</td>
                        <td className="py-3 px-4 text-right font-medium text-card-foreground">{e.amount.toLocaleString()} FCFA</td>
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
          <DialogHeader>
            <DialogTitle>Ajouter une dépense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant (FCFA) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.expense_type} onValueChange={v => setForm(f => ({ ...f, expense_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fréquence</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Select value={form.city_id} onValueChange={v => setForm(f => ({ ...f, city_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bien (optionnel)</Label>
              <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.category_id || !form.amount}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
