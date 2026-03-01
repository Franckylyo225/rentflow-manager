import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, MessageSquare, Mail, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const defaultTemplates = [
  {
    id: "before_5",
    label: "Rappel J-5 (avant échéance)",
    icon: Bell,
    smsEnabled: true,
    emailEnabled: true,
    sms: "Bonjour {{nom}}, votre loyer de {{montant}} FCFA est dû le {{date_echeance}}. Merci de procéder au paiement.",
    email: "Bonjour {{nom}},\n\nNous vous rappelons que votre loyer de {{montant}} FCFA est dû le {{date_echeance}}.\n\nMerci de procéder au paiement dans les délais.\n\nCordialement,\nImmobilière Ivoire",
  },
  {
    id: "after_1",
    label: "Relance J+1 (après échéance)",
    icon: MessageSquare,
    smsEnabled: true,
    emailEnabled: true,
    sms: "Bonjour {{nom}}, votre loyer de {{montant}} FCFA était dû hier. Merci de régulariser votre situation.",
    email: "Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA était dû le {{date_echeance}} et n'a pas encore été reçu.\n\nMerci de régulariser votre situation au plus vite.\n\nCordialement,\nImmobilière Ivoire",
  },
  {
    id: "after_7",
    label: "Relance J+7 (après échéance)",
    icon: MessageSquare,
    smsEnabled: true,
    emailEnabled: false,
    sms: "Bonjour {{nom}}, votre loyer de {{montant}} FCFA est en retard de 7 jours. Contactez-nous pour régulariser.",
    email: "Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est en retard de 7 jours depuis le {{date_echeance}}.\n\nNous vous prions de régulariser dans les plus brefs délais.\n\nCordialement,\nImmobilière Ivoire",
  },
];

export default function Notifications() {
  const [templates, setTemplates] = useState(defaultTemplates);

  const updateTemplate = (id: string, field: string, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    toast.success("Paramètres de notifications sauvegardés");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Configurez les relances automatiques SMS et Email</p>
          </div>
          <Button className="gap-2 self-start" onClick={handleSave}>
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>
        </div>

        <Card className="border-border bg-accent/30">
          <CardContent className="p-4">
            <p className="text-sm text-accent-foreground">
              <strong>Variables disponibles :</strong> {"{{nom}}"}, {"{{montant}}"}, {"{{date_echeance}}"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les relances s'arrêtent automatiquement lorsque le statut passe à "Payé".
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {templates.map(template => (
            <Card key={template.id} className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <template.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.label}</CardTitle>
                      <CardDescription>Modèle de notification</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-3.5 w-3.5" /> SMS
                      </Label>
                      <Switch
                        checked={template.smsEnabled}
                        onCheckedChange={(v) => updateTemplate(template.id, "smsEnabled", v)}
                      />
                    </div>
                    <Textarea
                      value={template.sms}
                      onChange={e => updateTemplate(template.id, "sms", e.target.value)}
                      rows={3}
                      className="text-sm"
                      disabled={!template.smsEnabled}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </Label>
                      <Switch
                        checked={template.emailEnabled}
                        onCheckedChange={(v) => updateTemplate(template.id, "emailEnabled", v)}
                      />
                    </div>
                    <Textarea
                      value={template.email}
                      onChange={e => updateTemplate(template.id, "email", e.target.value)}
                      rows={5}
                      className="text-sm"
                      disabled={!template.emailEnabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
