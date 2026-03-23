import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, Mail, Save, Loader2, Send, Phone, Info, Smartphone, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { SmsHistoryTable } from "./SmsHistoryTable";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

const TIMELINE_ICONS: Record<string, { icon: typeof Bell; label: string; color: string; bg: string }> = {
  before_5: { icon: Clock, label: "J-5", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  after_1: { icon: AlertTriangle, label: "J+1", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  after_7: { icon: AlertTriangle, label: "J+7", color: "text-destructive", bg: "bg-destructive/10" },
};

export function NotificationsTab() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Bonjour, ceci est un SMS de test envoyé depuis SCI Binieba.");
  const [sendingTest, setSendingTest] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_templates").select("*").order("created_at").then(({ data }) => {
      if (data) {
        setTemplates(data);
        if (data.length > 0) setExpandedTemplate(data[0].id);
      }
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
    toast.success("Paramètres de relance sauvegardés");
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error("Veuillez saisir un numéro de téléphone");
      return;
    }
    if (!testMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: testPhone.trim(),
          message: testMessage.trim(),
          senderName: "SCI Binieba",
          organizationId: profile?.organization_id,
          recipientName: "",
          templateKey: null,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("SMS de test envoyé avec succès !");
      } else {
        toast.error("Erreur : " + (data?.error || "Échec de l'envoi"));
      }
    } catch (err: any) {
      console.error("SMS test error:", err);
      toast.error("Erreur lors de l'envoi : " + (err.message || "Erreur inconnue"));
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const enabledSmsCount = templates.filter(t => t.sms_enabled).length;
  const enabledEmailCount = templates.filter(t => t.email_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Configurez les relances automatiques SMS et Email</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <MessageSquare className="h-3 w-3" /> {enabledSmsCount} SMS actif{enabledSmsCount > 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <Mail className="h-3 w-3" /> {enabledEmailCount} Email{enabledEmailCount > 1 ? "s" : ""} actif{enabledEmailCount > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Sauvegarder
        </Button>
      </div>

      {/* Timeline visual */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Chronologie des relances</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {templates.map((t, i) => {
              const config = TIMELINE_ICONS[t.template_key] || { icon: Bell, label: "?", color: "text-primary", bg: "bg-primary/10" };
              const Icon = config.icon;
              const isActive = t.sms_enabled || t.email_enabled;
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                      expandedTemplate === t.id 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    } ${!isActive ? "opacity-50" : ""}`}
                  >
                    <div className={`p-1.5 rounded-md ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{t.label}</p>
                    </div>
                    <div className="flex gap-0.5 ml-1">
                      {t.sms_enabled && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                      {t.email_enabled && <Mail className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </button>
                  {i < templates.length - 1 && (
                    <div className="h-px w-6 bg-border flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variables info */}
      <Card className="border-border bg-accent/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-accent-foreground">
              <strong>Variables disponibles :</strong>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{nom}}"}</code>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{montant}}"}</code>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{date_echeance}}"}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Les relances s'arrêtent automatiquement lorsque le statut passe à "Payé".</p>
          </div>
        </CardContent>
      </Card>

      {/* Template details */}
      <div className="space-y-4">
        {templates.map(template => {
          const config = TIMELINE_ICONS[template.template_key] || { icon: Bell, label: "?", color: "text-primary", bg: "bg-primary/10" };
          const Icon = config.icon;
          const isExpanded = expandedTemplate === template.id;

          if (!isExpanded) return null;

          return (
            <Card key={template.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.label}
                      <Badge variant="outline" className="text-[10px] font-normal">{config.label}</Badge>
                    </CardTitle>
                    <CardDescription>Modèle de notification automatique</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SMS Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <MessageSquare className="h-4 w-4 text-primary" /> SMS
                      </Label>
                      <Switch checked={template.sms_enabled} onCheckedChange={v => updateTemplate(template.id, "sms_enabled", v)} />
                    </div>
                    <Textarea
                      value={template.sms_content}
                      onChange={e => updateTemplate(template.id, "sms_content", e.target.value)}
                      rows={4}
                      className="text-sm resize-none"
                      disabled={!template.sms_enabled}
                      placeholder="Contenu du SMS..."
                    />
                    {template.sms_enabled && (
                      <p className="text-xs text-muted-foreground">{template.sms_content.length} / 160 caractères</p>
                    )}
                  </div>

                  {/* Email Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <Mail className="h-4 w-4 text-primary" /> Email
                      </Label>
                      <Switch checked={template.email_enabled} onCheckedChange={v => updateTemplate(template.id, "email_enabled", v)} />
                    </div>
                    <Textarea
                      value={template.email_content}
                      onChange={e => updateTemplate(template.id, "email_content", e.target.value)}
                      rows={6}
                      className="text-sm resize-none"
                      disabled={!template.email_enabled}
                      placeholder="Contenu de l'email..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Test SMS Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Tester l'envoi SMS</CardTitle>
              <CardDescription>Envoyez un SMS de test pour vérifier la configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Numéro de téléphone
              </Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+243 XXX XXX XXX"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Format international avec indicatif pays</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-template" className="text-sm font-medium">Modèle à tester</Label>
              <select
                id="test-template"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={e => {
                  const t = templates.find(t => t.id === e.target.value);
                  if (t) setTestMessage(t.sms_content);
                }}
              >
                <option value="">Message personnalisé</option>
                {templates.filter(t => t.sms_enabled).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message" className="text-sm font-medium">Message</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              placeholder="Saisissez votre message de test..."
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{testMessage.length} / 160 caractères</p>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSendTest}
                disabled={sendingTest || !testPhone.trim()}
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer le test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* SMS History */}
      <SmsHistoryTable />
    </div>
  );
}
