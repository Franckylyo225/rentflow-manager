import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExpenseCategories } from "@/hooks/useExpenses";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ExpenseCategories() {
  const { data: categories, loading, refetch } = useExpenseCategories();
  const { profile } = useProfile();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("expense_categories").insert({
      organization_id: profile?.organization_id,
      name: name.trim(),
      is_default: false,
    });
    if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
    toast.success("Catégorie ajoutée");
    setShowAdd(false);
    setName("");
    setSaving(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) { toast.error("Impossible de supprimer (catégorie utilisée ?)"); return; }
    toast.success("Catégorie supprimée");
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Catégories de dépenses</h1>
            <p className="text-muted-foreground text-sm mt-1">{categories.length} catégories configurées</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter une catégorie
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p>Aucune catégorie.</p>
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{c.name}</span>
                      {c.is_default && <Badge variant="secondary" className="text-xs">Par défaut</Badge>}
                    </div>
                    {!c.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nom de la catégorie *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Jardinage" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
