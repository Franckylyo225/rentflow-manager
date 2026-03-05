import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Loader2, Trash2, Edit, MapPin, Landmark, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const ASSET_TYPES = [
  { value: "terrain", label: "Terrain" },
  { value: "maison", label: "Maison" },
  { value: "titre", label: "Titre de propriété" },
  { value: "autre", label: "Autre" },
];

export default function Patrimoine() {
  const [assets, setAssets] = useState<any[]>([]);
  const [holders, setHolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddHolder, setShowAddHolder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [deletingAsset, setDeletingAsset] = useState<any>(null);
  const [form, setForm] = useState({ title: "", asset_type: "terrain", holder_id: "", locality: "", subdivision_name: "", land_title: "", handling_firm: "", description: "" });
  const [holderForm, setHolderForm] = useState({ full_name: "", phone: "", email: "", address: "" });
  const navigate = useNavigate();
  const { profile } = useProfile();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [assetsRes, holdersRes] = await Promise.all([
      supabase.from("patrimony_assets").select("*, asset_holders(full_name), patrimony_documents(document_type)").order("created_at", { ascending: false }),
      supabase.from("asset_holders").select("*").order("full_name"),
    ]);
    setAssets(assetsRes.data || []);
    setHolders(holdersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assets.filter(a => {
    if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.locality.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.title || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("patrimony_assets").insert({
      ...form,
      holder_id: form.holder_id || null,
      organization_id: profile.organization_id,
    });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Actif créé"); setShowAdd(false); resetForm(); fetchData(); }
  };

  const handleEdit = async () => {
    if (!form.title || !editingAsset) return;
    setSaving(true);
    const { error } = await supabase.from("patrimony_assets").update({
      ...form,
      holder_id: form.holder_id || null,
    }).eq("id", editingAsset.id);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Actif modifié"); setShowEdit(false); setEditingAsset(null); fetchData(); }
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setSaving(true);
    const { error } = await supabase.from("patrimony_assets").delete().eq("id", deletingAsset.id);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Actif supprimé"); setShowDelete(false); setDeletingAsset(null); fetchData(); }
  };

  const handleAddHolder = async () => {
    if (!holderForm.full_name || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("asset_holders").insert({
      ...holderForm,
      organization_id: profile.organization_id,
    });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Titulaire ajouté"); setShowAddHolder(false); setHolderForm({ full_name: "", phone: "", email: "", address: "" }); fetchData(); }
  };

  const resetForm = () => setForm({ title: "", asset_type: "terrain", holder_id: "", locality: "", subdivision_name: "", land_title: "", handling_firm: "", description: "" });

  const openEdit = (asset: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setForm({
      title: asset.title, asset_type: asset.asset_type, holder_id: asset.holder_id || "",
      locality: asset.locality, subdivision_name: asset.subdivision_name, land_title: asset.land_title,
      handling_firm: asset.handling_firm || "", description: asset.description || "",
    });
    setShowEdit(true);
  };

  const assetFormDialog = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type d'actif</Label>
          <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Titulaire</Label>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowAddHolder(true)}>
              <Users className="h-3 w-3" /> Nouveau
            </Button>
          </div>
          <Select value={form.holder_id} onValueChange={v => setForm(f => ({ ...f, holder_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {holders.map(h => <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Titre / Nom de l'actif</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Terrain Cocody Danga" />
      </div>
      <div className="space-y-2">
        <Label>Titre foncier</Label>
        <Input value={form.land_title} onChange={e => setForm(f => ({ ...f, land_title: e.target.value }))} placeholder="Ex: TF 12345" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Localité</Label>
          <Input value={form.locality} onChange={e => setForm(f => ({ ...f, locality: e.target.value }))} placeholder="Ex: Cocody, Abidjan" />
        </div>
        <div className="space-y-2">
          <Label>Nom du lotissement</Label>
          <Input value={form.subdivision_name} onChange={e => setForm(f => ({ ...f, subdivision_name: e.target.value }))} placeholder="Ex: Lot 45, Ilot 12" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cabinet traitant</Label>
        <Input value={form.handling_firm} onChange={e => setForm(f => ({ ...f, handling_firm: e.target.value }))} placeholder="Ex: Cabinet Me Koné" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes..." rows={2} />
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Patrimoine</h1>
            <p className="text-muted-foreground text-sm mt-1">{assets.length} actifs · {holders.length} titulaires</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => { resetForm(); setShowAdd(true); }}>
            <Plus className="h-4 w-4" /> Ajouter un actif
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {assets.length === 0 ? "Aucun actif. Commencez par en ajouter un." : "Aucun résultat."}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Titre</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Titulaire</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Type</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Localité</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Titre foncier</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(asset => (
                      <tr
                        key={asset.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/patrimoine/${asset.id}`)}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-card-foreground">{asset.title}</p>
                          <p className="text-xs text-muted-foreground">{asset.subdivision_name}</p>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{asset.asset_holders?.full_name || "—"}</td>
                        <td className="py-3 px-4 text-center hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{ASSET_TYPES.find(t => t.value === asset.asset_type)?.label || asset.asset_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{asset.locality || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{asset.land_title || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(asset, e)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingAsset(asset); setShowDelete(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
      </div>

      {/* Add asset */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Ajouter un actif</DialogTitle></DialogHeader>
          {assetFormDialog()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.title}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit asset */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Modifier l'actif</DialogTitle></DialogHeader>
          {assetFormDialog()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !form.title}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete asset */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet actif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'actif « {deletingAsset?.title} » et tous ses documents seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add holder */}
      <Dialog open={showAddHolder} onOpenChange={setShowAddHolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un titulaire</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={holderForm.full_name} onChange={e => setHolderForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: Kouadio Jean" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={holderForm.phone} onChange={e => setHolderForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 00 00 00" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={holderForm.email} onChange={e => setHolderForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={holderForm.address} onChange={e => setHolderForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresse..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddHolder(false)}>Annuler</Button>
            <Button onClick={handleAddHolder} disabled={saving || !holderForm.full_name}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
