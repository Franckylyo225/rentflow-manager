import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bell, MessageSquare, Mail, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function NotificationsTab() {
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
    <div className="space-y-4 max-w-3xl">
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
