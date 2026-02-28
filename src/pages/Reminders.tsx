import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, MessageSquare, Mail, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const defaultTemplates = [
  {
    id: "before_5",
    label: "Rappel 5 jours avant",
    icon: Bell,
    sms: "Bonjour {nom}, votre loyer de {montant} MAD pour {unité} est dû le {date}. Merci de procéder au paiement.",
    email: "Bonjour {nom},\n\nNous vous rappelons que votre loyer de {montant} MAD pour {unité} ({bien}) est dû le {date}.\n\nMerci de procéder au paiement dans les délais.\n\nCordialement,\n{entreprise}",
  },
  {
    id: "after_1",
    label: "Relance J+1",
    icon: MessageSquare,
    sms: "Bonjour {nom}, votre loyer de {montant} MAD pour {unité} était dû hier. Merci de régulariser votre situation.",
    email: "Bonjour {nom},\n\nVotre loyer de {montant} MAD pour {unité} ({bien}) était dû le {date} et n'a pas encore été reçu.\n\nMerci de régulariser votre situation au plus vite.\n\nCordialement,\n{entreprise}",
  },
  {
    id: "after_7",
    label: "Relance J+7",
    icon: MessageSquare,
    sms: "Bonjour {nom}, votre loyer de {montant} MAD est en retard de 7 jours. Contactez-nous pour régulariser.",
    email: "Bonjour {nom},\n\nVotre loyer de {montant} MAD pour {unité} ({bien}) est en retard de 7 jours.\n\nNous vous prions de régulariser votre situation dans les plus brefs délais ou de nous contacter pour trouver une solution.\n\nCordialement,\n{entreprise}",
  },
];

export default function Reminders() {
  const [templates, setTemplates] = useState(defaultTemplates);

  const updateTemplate = (id: string, field: "sms" | "email", value: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    toast.success("Modèles de relance sauvegardés");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Relances automatiques</h1>
            <p className="text-muted-foreground text-sm mt-1">Configurez les messages de rappel et relance SMS / Email</p>
          </div>
          <Button className="gap-2 self-start" onClick={handleSave}>
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>
        </div>

        <Card className="border-border bg-accent/30">
          <CardContent className="p-4">
            <p className="text-sm text-accent-foreground">
              <strong>Variables disponibles :</strong> {"{nom}"}, {"{montant}"}, {"{unité}"}, {"{bien}"}, {"{date}"}, {"{entreprise}"}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {templates.map(template => (
            <Card key={template.id} className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <template.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.label}</CardTitle>
                    <CardDescription>Modèle SMS et Email</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-3.5 w-3.5" /> SMS
                    </Label>
                    <Textarea
                      value={template.sms}
                      onChange={e => updateTemplate(template.id, "sms", e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                    <Textarea
                      value={template.email}
                      onChange={e => updateTemplate(template.id, "email", e.target.value)}
                      rows={5}
                      className="text-sm"
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
