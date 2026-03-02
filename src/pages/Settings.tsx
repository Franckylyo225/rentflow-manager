import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Shield, Bell, MessageSquare, Mail, Save, Loader2, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useExpenseCategories } from "@/hooks/useExpenses";

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, organization } = useProfile();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration de votre espace Rentflow</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Général</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Catégories dépenses</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab organization={organization} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* ─── General Tab ─── */
function GeneralTab({ organization }: { organization: any }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
            <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'entreprise</Label>
              <Input defaultValue={organization?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input defaultValue={organization?.email || ""} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input defaultValue={organization?.phone || ""} />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input defaultValue={organization?.address || ""} />
            </div>
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-4 w-4 text-primary" /></div>
            <CardTitle className="text-base">Sécurité & Rôles</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="font-medium text-card-foreground">Rôles disponibles :</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              <li>• <strong>Administrateur</strong> — Accès complet</li>
              <li>• <strong>Gestionnaire</strong> — Gestion des biens et locataires</li>
              <li>• <strong>Comptable</strong> — Accès aux loyers et rapports</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Categories Tab ─── */
function CategoriesTab() {
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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} catégories configurées</p>
        <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
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
    </div>
  );
}

/* ─── Notifications Tab ─── */
function NotificationsTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_templates").select("*").order("created_at").then(({ data }) => {
      if (data) setTemplates(data);
      setLoading(false);
    });
  }, [user]);

  const updateTemplate = (id: string, field: string, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const t of templates) {
      await supabase.from("notification_templates").update({
        sms_enabled: t.sms_enabled,
        email_enabled: t.email_enabled,
        sms_content: t.sms_content,
        email_content: t.email_content,
      }).eq("id", t.id);
    }
    setSaving(false);
    toast.success("Paramètres sauvegardés");
  };

  const iconMap: Record<string, any> = { before_5: Bell, after_1: MessageSquare, after_7: MessageSquare };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configurez les relances automatiques SMS et Email</p>
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Sauvegarder
        </Button>
      </div>

      <Card className="border-border bg-accent/30">
        <CardContent className="p-4">
          <p className="text-sm text-accent-foreground">
            <strong>Variables disponibles :</strong> {"{{nom}}"}, {"{{montant}}"}, {"{{date_echeance}}"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Les relances s'arrêtent automatiquement lorsque le statut passe à "Payé".</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {templates.map(template => {
          const Icon = iconMap[template.template_key] || Bell;
          return (
            <Card key={template.id} className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                  <div>
                    <CardTitle className="text-base">{template.label}</CardTitle>
                    <CardDescription>Modèle de notification</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-3.5 w-3.5" /> SMS</Label>
                      <Switch checked={template.sms_enabled} onCheckedChange={v => updateTemplate(template.id, "sms_enabled", v)} />
                    </div>
                    <Textarea value={template.sms_content} onChange={e => updateTemplate(template.id, "sms_content", e.target.value)} rows={3} className="text-sm" disabled={!template.sms_enabled} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium"><Mail className="h-3.5 w-3.5" /> Email</Label>
                      <Switch checked={template.email_enabled} onCheckedChange={v => updateTemplate(template.id, "email_enabled", v)} />
                    </div>
                    <Textarea value={template.email_content} onChange={e => updateTemplate(template.id, "email_content", e.target.value)} rows={5} className="text-sm" disabled={!template.email_enabled} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
